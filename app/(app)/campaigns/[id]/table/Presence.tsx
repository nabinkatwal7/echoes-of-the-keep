"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/app/components/ui/Badge";

type Member = { id: string; name: string; role: string; online: boolean };

/** Marks you as present and shows who else has the table open. */
export function Presence({ campaignId, userId }: { campaignId: string; userId: string }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    let alive = true;
    const url = `/api/campaigns/${campaignId}/presence`;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(url, { method: "POST", cache: "no-store" });
        if (res.ok && alive) setMembers(((await res.json()) as { members: Member[] }).members);
      } catch {
        // offline: try again next tick
      }
    };
    void tick();
    const t = setInterval(tick, 400);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [campaignId]);

  if (!members.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Who is at the table">
      {members.map((m) => (
        <li key={m.id}>
          <Badge tone={m.online ? "emerald" : "neutral"}>
            <span aria-hidden="true">{m.online ? "●" : "○"}</span> {m.name}
            {m.id === userId ? " (you)" : ""}
            {m.role === "DM" ? " · DM" : ""}
            <span className="sr-only">{m.online ? " is here" : " is away"}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
