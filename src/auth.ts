import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { upsertGoogleUser } from "@/db/users";

declare module "next-auth" {
  interface Session {
    user: {
      /** The player's row in the database; missing if it couldn't be saved at sign-in. */
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}

// Credentials come from .env.local: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (read
// automatically by Auth.js). Sessions stay encrypted JWT cookies; the database stores players.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Only on sign-in: save (or refresh) the player and remember their database id.
      if (account?.provider === "google" && profile?.sub) {
        try {
          token.userId = await upsertGoogleUser({
            googleId: profile.sub,
            name: profile.name ?? null,
            email: profile.email ?? null,
            image: typeof profile.picture === "string" ? profile.picture : null,
          });
        } catch (error) {
          // Don't block sign-in on a database outage; account features stay off until the
          // player signs in again.
          console.error("[auth] could not save user", error);
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
});
