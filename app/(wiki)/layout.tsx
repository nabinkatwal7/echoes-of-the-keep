import { WikiNav } from "./WikiNav";

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row">
      <aside className="no-print lg:sticky lg:top-24 lg:h-fit lg:w-56 lg:shrink-0">
        <WikiNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
