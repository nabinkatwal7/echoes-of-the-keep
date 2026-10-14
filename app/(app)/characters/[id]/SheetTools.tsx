"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button, buttonClasses } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import type { AuditIssue } from "@/lib/characters/audit";
import { runAudit } from "@/lib/characters/portableActions";
import { setPortrait } from "@/lib/characters/sheetActions";
import { Input } from "@/app/components/ui/Input";

export function SheetTools({ id, portraitUrl = "" }: { id: string; portraitUrl?: string }) {
  const [portrait, setPortraitUrl] = useState(portraitUrl);
  const [portraitMsg, setPortraitMsg] = useState("");
  const [pending, start] = useTransition();
  const [issues, setIssues] = useState<AuditIssue[] | null>(null);
  const [error, setError] = useState("");

  return (
    <Card flat className="no-print flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
        <a href={`/characters/${id}/export`} className={buttonClasses("secondary")}>
          Export JSON
        </a>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await runAudit(id);
              if (r.ok) {
                setIssues(r.issues);
                setError("");
              } else setError(r.errors[0]);
            })
          }
        >
          {pending ? "Checking…" : "Rules audit"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="url" placeholder="Portrait image link (https)" value={portrait} onChange={(e) => setPortraitUrl(e.target.value)} aria-label="Portrait image link" className="min-w-0 flex-1" maxLength={500} />
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setPortrait(id, portrait);
              setPortraitMsg(r.ok ? (portrait.trim() ? "Portrait saved." : "Portrait removed.") : r.errors[0]);
            })
          }
        >
          Save portrait
        </Button>
      </div>
      {portraitMsg && <p role="status" className="text-sm text-muted">{portraitMsg}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {issues && (
        <div className="flex flex-col gap-2">
          {issues.length === 0 ? (
            <Badge tone="emerald" className="self-start">
              No rule problems found
            </Badge>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {issues.map((i, n) => (
                <li key={n} className="flex gap-2">
                  <Badge tone={i.severity === "error" ? "crimson" : "ember"}>{i.severity}</Badge>
                  <span>{i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
