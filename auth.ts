import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Providers are enabled only when their credentials are configured (see .env.example).
const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);
if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) providers.push(Discord);
if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(Nodemailer({ server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM }));
}

export const providerIds = providers.map((p) => (typeof p === "function" ? p().id : p.id));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
