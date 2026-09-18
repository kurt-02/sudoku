import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Credentials come from .env.local: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (read
// automatically by Auth.js). Sessions are encrypted JWT cookies until the database lands.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
});
