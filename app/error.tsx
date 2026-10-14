"use client";

import { useEffect } from "react";
import { MonsterAvatar } from "./components/pixel/Avatars";
import { Button } from "./components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <div className="anim-bob">
        <MonsterAvatar type="ooze" name="A confused ooze" size={96} />
      </div>
      <h1 className="gilded text-3xl font-bold">Something went wrong</h1>
      <p className="text-foreground/85">A trap went off on the way here. Nothing is lost; try again.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
