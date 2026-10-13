import { auth } from "@/auth";
import { getMembership, scanEvents } from "@/lib/campaigns/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  let timer: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let busy = false;

  const stop = () => {
    clearInterval(timer);
    clearInterval(heartbeat);
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      send("retry: 2000\n\n");

      const tick = async () => {
        if (busy) return;
        busy = true;
        try {
          const { events, lastId } = await scanEvents(id, viewer, last);
          for (const e of events) {
            send(`id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify({ ...e, createdAt: e.createdAt.toISOString() })}\n\n`);
          }
          // advance past hidden events too, otherwise they would be re-scanned on every poll
          last = lastId;
        } catch {
          // transient DB error: the next poll (or a reconnect with Last-Event-ID) resumes
        } finally {
          busy = false;
        }
      };

      timer = setInterval(tick, POLL_MS);
      heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);
      void tick();
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
