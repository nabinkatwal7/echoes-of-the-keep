import { WINDOW_MS, holdExpired, isThrottled } from "@/lib/account/throttle";
import { verifyPassword } from "@/lib/password";
import { logger } from "@/lib/log";
import { deleteSoloGamesOf } from "@/lib/solo/cleanup";
import { prisma } from "@/lib/prisma";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

async function throttled(username: string): Promise<boolean> {
  const row = await prisma.loginThrottle.findUnique({ where: { username } });
  return !!row && isThrottled(row.failures, row.windowStart);
}

async function recordFailure(username: string) {
  const row = await prisma.loginThrottle.findUnique({ where: { username } });
  const fresh = !row || Date.now() - row.windowStart.getTime() > WINDOW_MS;
  await prisma.loginThrottle.upsert({
    where: { username },
    create: { username, failures: 1 },
    update: fresh ? { failures: 1, windowStart: new Date() } : { failures: { increment: 1 } },
  });
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
        if (!username || !password) return null;
        if (await throttled(username)) {
          logger.warn("login throttled", { username });
          return null;
        }
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !verifyPassword(password, user.passwordHash)) {
          await recordFailure(username);
          logger.info("login failed", { username });
          return null;
        }
        if (user.deletedAt) {
          if (holdExpired(user.deletedAt)) {
            await deleteSoloGamesOf(user.id);
            await prisma.user.delete({ where: { id: user.id } });
            return null;
          }
          await prisma.user.update({ where: { id: user.id }, data: { deletedAt: null } });
        }
        await prisma.loginThrottle.deleteMany({ where: { username } });
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
