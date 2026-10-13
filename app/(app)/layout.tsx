import { requireUser } from "@/lib/auth";

/** Everything under (app)/ needs a signed-in user; the site header comes from the root layout. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>;
}
