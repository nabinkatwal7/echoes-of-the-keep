import { notFound } from "next/navigation";
import { Lab } from "./Lab";

export const metadata = { title: "Cutscene lab" };

/** Every cutscene on demand, for checking how they look. Only in development. */
export default function CutsceneLab() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="gilded text-3xl font-bold">Cutscene lab</h1>
      <Lab />
    </main>
  );
}
