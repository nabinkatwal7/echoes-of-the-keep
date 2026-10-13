import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Username + password only. Credentials sign-in requires JWT sessions (no database session table).
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

/** Small in-memory brake on password guessing; swap for a shared store when running several instances. */
function throttled(username: string): boolean {
  const f = failures.get(username);
  if (!f) return false;
  if (Date.now() - f.first > WINDOW_MS) {
    failures.delete(username);
    return false;
  }
  return f.count >= MAX_FAILURES;
}

function recordFailure(username: string) {
  const f = failures.get(username);
  if (!f || Date.now() - f.first > WINDOW_MS)
    failures.set(username, { count: 1, first: Date.now() });
  else f.count++;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw) {
        const username = String(raw?.username ?? "")
          .trim()
          .toLowerCase();
        const password = String(raw?.password ?? "");
        if (!username || !password || throttled(username)) return null;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !verifyPassword(password, user.passwordHash)) {
          recordFailure(username);
          return null;
        }
        failures.delete(username);
        return { id: user.id, name: user.displayName };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
