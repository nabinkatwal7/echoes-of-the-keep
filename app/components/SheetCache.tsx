"use client";

import { useEffect } from "react";

/** Remember the open sheet in this browser so /offline can show it later. */
export function SheetCache({ id, name, line }: { id: string; name: string; line: string }) {
  useEffect(() => {
    try {
      localStorage.setItem("dnd-sheet", JSON.stringify({ id, name, line, savedAt: new Date().toISOString() }));
    } catch {
      // private mode: the sheet still works online
    }
  }, [id, name, line]);
  return null;
}
