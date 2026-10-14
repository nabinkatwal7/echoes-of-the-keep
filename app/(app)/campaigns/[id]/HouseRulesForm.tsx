"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { updateHouseRules } from "@/lib/campaigns/actions";
import type { HouseRules } from "@/lib/campaigns/houseRules";

/** Switches stored on the campaign. Level-up and attacks read them. */
export function HouseRulesForm({ campaignId, initial }: { campaignId: string; initial: HouseRules }) {
  const [rules, setRules] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const toggle = (key: keyof HouseRules) => setRules((r) => ({ ...r, [key]: !r[key] }));

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="eyebrow">House rules</h2>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rules.multiclass} onChange={() => toggle("multiclass")} />
        Multiclassing
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rules.feats} onChange={() => toggle("feats")} />
        Feats
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rules.flanking} onChange={() => toggle("flanking")} />
        Flanking (advantage from opposite sides)
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await updateHouseRules(campaignId, rules);
            setError(r.ok ? "" : r.errors[0]);
          })
        }
      >
        Save rules
      </Button>
    </Card>
  );
}
