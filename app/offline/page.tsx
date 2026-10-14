"use client";

import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

type Sheet = { id: string; name: string; line: string; savedAt: string };

/** The last character sheet this browser opened, readable with no network. */
export default function OfflineSheet() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dnd-sheet");
      if (raw) setSheet(JSON.parse(raw) as Sheet);
    } catch {
      setSheet(null);
    }
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <PageHeader eyebrow="Offline" title={sheet?.name ?? "No sheet saved"} subtitle="The last hero you opened on this device." />
      <Card className="p-5">
        {sheet ? <p className="whitespace-pre-wrap">{sheet.line}</p> : <p className="text-muted">Open a character sheet once while online. It will be here when the network is not.</p>}
      </Card>
    </div>
  );
}
