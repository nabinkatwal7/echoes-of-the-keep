"use client";

import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { DiceChip } from "@/app/components/ui/DiceChip";
import { Input } from "@/app/components/ui/Input";
import { postMessage } from "@/lib/campaigns/actions";
import { useEffect, useRef, useState, useTransition } from "react";

export type TableEvent = {
  id: number;
  type: string;
  actorId: string | null;
  audience: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

const DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;

type Connection = "connecting" | "live" | "reconnecting";

export function TableClient({
  campaignId,
  userId,
  isDm,
  initial,
}: {
  campaignId: string;
  userId: string;
  isDm: boolean;
  initial: TableEvent[];
}) {
  const [events, setEvents] = useState<TableEvent[]>(initial);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const endRef = useRef<HTMLDivElement>(null);

  // live stream: EventSource reconnects on its own and resends Last-Event-ID, so nothing is missed
  useEffect(() => {
    const source = new EventSource(
      `/api/campaigns/${campaignId}/stream?after=${lastId.current}`,
    );
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection("reconnecting");
    source.onmessage = (msg: MessageEvent) => {
      const event = JSON.parse(msg.data) as TableEvent;
      lastId.current = Math.max(lastId.current, event.id);
      setEvents((prev) =>
        prev.some((e) => e.id === event.id) ? prev : [...prev, event],
      );
    };
    return () => source.close();
  }, [campaignId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  function send(input: string) {
    if (!input.trim()) return;
    start(async () => {
      const r = await postMessage(campaignId, input);
      if (r.ok) {
        setText("");
        setError("");
      } else setError(r.errors[0]);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
      <Card className="flex h-[65vh] min-h-[28rem] flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">Chronicle</h2>
          <Badge tone={connection === "live" ? "emerald" : "ember"}>
            {connection === "live"
              ? "Live"
              : connection === "connecting"
                ? "Connecting"
                : "Reconnecting"}
          </Badge>
        </div>
        <div
          className="flex-1 overflow-y-auto pr-2"
          role="log"
          aria-live="polite"
        >
          {events.length === 0 && (
            <p className="py-10 text-center text-muted">
              The table is quiet. Roll something, or say hello.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <EventLine key={e.id} event={e} mine={e.actorId === userId} />
            ))}
          </ul>
          <div ref={endRef} />
        </div>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            send(text);
          }}
          className="flex gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Speak, or /roll 2d6+3 stealth"
            aria-label="Message"
            maxLength={500}
            autoComplete="off"
          />
          <Button disabled={pending || !text.trim()}>Send</Button>
        </form>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      <aside className="flex flex-col gap-4">
        <Card flat className="flex flex-col gap-3">
          <h2 className="eyebrow">Quick dice</h2>
          <div className="grid grid-cols-4 gap-2">
            {DICE.map((d) => (
              <Button
                key={d}
                variant="secondary"
                className="min-h-10 px-2"
                disabled={pending}
                onClick={() => send(`/roll 1${d}`)}
              >
                {d}
              </Button>
            ))}
          </div>
          {isDm && (
            <Button
              variant="ghost"
              className="justify-start px-0 normal-case tracking-normal"
              disabled={pending}
              onClick={() => send("/gmroll 1d20")}
            >
              Secret d20 (DM only)
            </Button>
          )}
        </Card>
        <Card flat className="text-sm text-muted">
          <p className="rune-label mb-2">Commands</p>
          <ul className="flex flex-col gap-1">
            <li>
              <code className="text-goldBright">/roll 2d6+3 reason</code>
            </li>
            <li>
              <code className="text-goldBright">/me waves</code>
            </li>
            <li>
              <code className="text-goldBright">/w dm message</code> or <code className="text-goldBright">/w name message</code> whisper to
              the DM
            </li>
            {isDm && (
              <li>
                <code className="text-goldBright">/gmroll 1d20</code> secret
                roll
              </li>
            )}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function EventLine({ event, mine }: { event: TableEvent; mine: boolean }) {
  const p = event.payload;
  const who = String(p.actorName ?? "Someone");
  const time = new Date(event.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (event.type === "sheet") {
    return (
      <li className="rounded border border-borderSoft bg-black/20 px-3 py-1.5 text-sm text-foreground/80">
        <span className="rune-label mr-2 text-gold">Sheet</span>
        {String(p.text)}{" "}
        <span className="text-xs text-muted">
          · {who} · {time}
        </span>
      </li>
    );
  }

  if (event.type === "system") {
    return (
      <li className="py-1 text-center text-xs italic text-muted">
        {String(p.text)} · {time}
      </li>
    );
  }

  if (event.type === "roll") {
    const rolls = (p.rolls as number[][]) ?? [];
    const expression = String(p.expression);
    const natural =
      /^1?d20$/i.test(expression.split(/[+-]/)[0]) && rolls[0]?.length === 1
        ? rolls[0][0]
        : null;
    return (
      <li
        className={`flex flex-wrap items-center gap-2 rounded px-3 py-2 ${p.secret ? "border border-dashed border-crimson/60 bg-crimson/5" : "bg-white/[0.03]"}`}
      >
        <span className="font-display text-xs uppercase tracking-[0.12em] text-gold">
          {who}
        </span>
        <span className="text-muted">rolls</span>
        <DiceChip
          expression={expression}
          total={Number(p.total)}
          crit={natural === 20}
          fumble={natural === 1}
        />
        {rolls.length > 0 && (
          <span className="text-xs text-muted">
            [{rolls.map((r) => r.join(", ")).join(" | ")}]
          </span>
        )}
        {p.reason ? (
          <span className="text-sm italic text-foreground/80">
            {String(p.reason)}
          </span>
        ) : null}
        {p.secret ? <Badge tone="crimson">Secret</Badge> : null}
        <span className="ml-auto text-xs text-muted">{time}</span>
      </li>
    );
  }

  const whisper = Boolean(p.whisper);
  return (
    <li
      className={`rounded px-3 py-2 ${mine ? "bg-gold/10" : "bg-white/[0.03]"} ${whisper ? "border border-dashed border-arcane/60" : ""}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xs uppercase tracking-[0.12em] text-gold">
          {who}
        </span>
        {Boolean(p.isDm) && <Badge tone="crimson">DM</Badge>}
        {whisper && <Badge tone="arcane">{p.to ? `Whisper to ${String(p.to)}` : "Whisper to DM"}</Badge>}
        <span className="ml-auto text-xs text-muted">{time}</span>
      </div>
      <p className={p.emote ? "italic text-foreground/80" : ""}>
        {p.emote ? `${who} ${String(p.text)}` : String(p.text)}
      </p>
    </li>
  );
}
