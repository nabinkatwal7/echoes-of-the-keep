"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, LinkButton } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { autoRun } from "@/lib/combat/autoActions";
import { continueStory, deleteSoloGame, generateEncounter, setAutoMonsters } from "@/lib/solo/actions";

const LABEL: Record<string, string> = {
  intro: "Begin the story",
  "fight-1": "Face the first foes",
  "rest-1": "Rest and search",
  "fight-2": "Go deeper",
  "rest-2": "Rest and search",
  boss: "Enter the final chamber",
  epilogue: "See how it ends",
};

/** What to do next: move the story on, or (as Dungeon Master) set up a fight yourself. */
export function SoloControls({ campaignId, mode, autoMonsters, sceneKind, complete, fightId }: { campaignId: string; mode: "player" | "dm"; autoMonsters: boolean; sceneKind: string | null; complete: boolean; fightId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; errors?: string[] } & Record<string, unknown>>, after?: (r: Record<string, unknown>) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        after?.(r);
        router.refresh();
      } else setError(r.errors?.[0] ?? "That did not work");
    });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="eyebrow">What next?</h2>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald">{message}</p>}

      {mode === "player" && (
        fightId ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">A fight is under way.</p>
            <LinkButton href={`/campaigns/${campaignId}/combat`}>Go to the fight</LinkButton>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => autoRun(fightId), () => setMessage("The computer played its turns."))}>Play the computer&apos;s turns</Button>
          </div>
        ) : (
          <Button
            disabled={pending}
            onClick={() => run(() => continueStory(campaignId), (r) => {
              setMessage(String(r.message ?? ""));
              if (r.encounterId) router.push(`/campaigns/${campaignId}/combat`);
            })}
          >
            {complete ? "Begin the next chapter" : sceneKind ? LABEL[sceneKind] : "Continue"}
          </Button>
        )
      )}

      {mode === "dm" && (
        <>
          <p className="text-sm text-muted">Set up a fight suited to the party, then run it from the Combat page. Computer heroes play their own turns.</p>
          <div className="flex flex-wrap gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <Button key={d} variant="secondary" disabled={pending} onClick={() => run(() => generateEncounter(campaignId, d, true), (r) => { setMessage(`Combat begins against ${String(r.foes)}.`); router.push(`/campaigns/${campaignId}/combat`); })}>
                {d[0].toUpperCase() + d.slice(1)} fight
              </Button>
            ))}
            {fightId && <LinkButton href={`/campaigns/${campaignId}/combat`}>Go to the fight</LinkButton>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoMonsters} disabled={pending} onChange={(e) => run(() => setAutoMonsters(campaignId, e.target.checked))} />
            Let the computer play the monsters too
          </label>
        </>
      )}

      <div className="border-t border-border pt-3">
        <Button variant="ghost" disabled={pending} onClick={() => confirm("Delete this solo game and its computer players? This cannot be undone.") && run(() => deleteSoloGame(campaignId), () => router.push("/solo"))}>Delete this game</Button>
      </div>
    </Card>
  );
}
