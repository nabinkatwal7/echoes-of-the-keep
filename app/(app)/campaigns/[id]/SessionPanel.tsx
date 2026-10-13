"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Textarea } from "@/app/components/ui/Input";
import { endSession, setNextUp, startSession } from "@/lib/journal/sessionActions";

type Props = {
  campaignId: string;
  active: { number: number; title: string; nextUp: string } | null;
  last: { number: number; summary: string; nextUp: string } | null;
};

/** DM controls for starting a session (opens with the last recap) and saving it when play stops. */
export function SessionPanel({ campaignId, active, last }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [nextUp, setNext] = useState(active?.nextUp ?? "");

  const run = (fn: () => Promise<{ ok: boolean; errors?: string[] }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        after?.();
        router.refresh();
      } else setError(r.errors?.[0] ?? "That did not work");
    });

  return (
    <Card className="flex h-fit flex-col gap-3 p-4">
      <h2 className="eyebrow">{active ? `Session ${active.number} in progress` : "Session"}</h2>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!active && (
        <>
          {last && (
            <div className="text-sm">
              <p className="rune-label">Last time (session {last.number})</p>
              <p className="whitespace-pre-wrap">{last.summary}</p>
              {last.nextUp && <p className="mt-1 text-muted">Next up: {last.nextUp}</p>}
            </div>
          )}
          <Input placeholder="Session title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Session title" />
          <Button disabled={pending} onClick={() => run(() => startSession(campaignId, title), () => setTitle(""))}>Start session</Button>
        </>
      )}
      {active && (
        <>
          <Textarea placeholder="Where does the story stand? (saved as the hook for next time)" value={nextUp} onChange={(e) => setNext(e.target.value)} rows={2} aria-label="Next up" />
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setNextUp(campaignId, nextUp))}>Save note</Button>
          <Textarea placeholder="Session summary (shared with the party as a recap)" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} aria-label="Session summary" />
          <Button disabled={pending || !summary.trim()} onClick={() => run(() => endSession(campaignId, summary, nextUp), () => setSummary(""))}>Save &amp; end session</Button>
        </>
      )}
    </Card>
  );
}
