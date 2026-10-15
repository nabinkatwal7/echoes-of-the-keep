import { auth } from "@/auth";
import { waitForCampaign } from "@/lib/campaigns/listen";
import { getMembership, scanEvents } from "@/lib/campaigns/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Vercel may keep this connection open this long; the browser reconnects and resumes from the last event it saw. */
export const maxDuration = 300;

const POLL_MS = 1000;
const HEARTBEAT_MS = 15000;

/**
 * Server-Sent Events for a campaign. Resumes after `Last-Event-ID` (or ?after=) so a reconnect
 * replays anything missed. Events are filtered per viewer, so hidden information never leaves the server.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const membership = await getMembership(id, session.user.id);
  if (!membership) return new Response("Forbidden", { status: 403 });

  const viewer = { userId: session.user.id, isDm: membership.role === "DM" };
  const url = new URL(req.url);
  let last = Number(req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? 0) || 0;

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  const stop = () => {
    stopped = true;
    clearInterval(heartbeat);
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      send("retry: 2000\n\n");

      const loop = async () => {
        while (!stopped) {
          try {
            const { events, lastId } = await scanEvents(id, viewer, last);
            for (const e of events) {
              send(`id: ${e.id}\ndata: ${JSON.stringify({ ...e, createdAt: e.createdAt.toISOString() })}\n\n`);
            }
            // advance past hidden events too, otherwise they would be re-scanned on every poll
            last = lastId;
          } catch {
            // transient DB error: the next wake (or a reconnect with Last-Event-ID) resumes
          }
          if (stopped) break;
          await waitForCampaign(id, POLL_MS);
        }
      };

      heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);
      void loop();
      req.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel: stop,
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
