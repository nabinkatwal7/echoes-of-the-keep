import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { actingAs } from "@/lib/actAs";

/** Current session user, or null when signed out. */
export async function getUser() {
  const bot = actingAs();
  if (bot) return { id: bot.id, name: bot.name };
  const session = await auth();
  return session?.user ?? null;
}

/** For pages under (app)/: redirects to /login when signed out. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
