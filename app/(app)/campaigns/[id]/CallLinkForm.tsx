"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { newJitsiRoom } from "@/lib/campaigns/call";
import { setCallLink } from "@/lib/campaigns/actions";

/** The DM pastes a Discord, Meet or Zoom link, or makes a free Jitsi room, and everyone gets a Join button. */
export function CallLinkForm({ campaignId, campaignName, initial }: { campaignId: string; campaignName: string; initial: string }) {
  const [url, setUrl] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const save = (value: string) =>
    start(async () => {
      const r = await setCallLink(campaignId, value);
      if (r.ok) {
        setError("");
        setUrl(value.trim());
        setMessage(value.trim() ? "Saved. Everyone sees a Join button." : "Call link removed.");
      } else {
        setMessage("");
        setError(r.errors[0]);
      }
    });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="eyebrow">Voice and video</h2>
      <p className="text-sm text-muted">Paste a Discord, Google Meet or Zoom link, or make a free Jitsi room that needs no account.</p>
      <Input type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Call link" maxLength={300} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => save(url)}>Save</Button>
        <Button variant="secondary" disabled={pending} onClick={() => save(newJitsiRoom(campaignName, Math.random().toString(36).slice(2, 8)))}>Make a Jitsi room</Button>
        {url && <Button variant="ghost" disabled={pending} onClick={() => save("")}>Remove</Button>}
      </div>
    </Card>
  );
}
