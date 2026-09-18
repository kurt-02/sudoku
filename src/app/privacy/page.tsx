import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What this Sudoku game collects, why, and how to delete it.",
};

// Keep this page true to what the app actually stores. Update it (and the date) before shipping
// any feature that collects something new or shows your information to other players.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="September 18, 2026">
      <section>
        <p>
          This Sudoku game is a personal project made by Kurt. This page explains what the game
          stores about you, why, and how to remove it. The short version: you can play without an
          account, signing in only saves your games and stats to your account, and nothing is sold,
          used for ads, or shared beyond the services that keep the game running.
        </p>
      </section>

      <section>
        <h2>Playing as a guest</h2>
        <p>
          Without signing in, your games, stats, and settings are saved only in your browser (its
          local storage). They aren&apos;t sent to the game&apos;s servers. Clearing your
          browser&apos;s site data removes all of it; <strong>Reset stats</strong> in Settings
          clears just the stats.
        </p>
      </section>

      <section>
        <h2>Signing in with Google</h2>
        <p>If you choose to sign in with Google, the game receives and stores:</p>
        <ul>
          <li>Your name and profile picture, shown on the menu while you&apos;re signed in.</li>
          <li>Your email address, to identify your account.</li>
          <li>Google&apos;s ID for your account, so you get the same account every time.</li>
        </ul>
        <p>
          The game asks Google for nothing else: no contacts, no Drive or Gmail access, and no
          permission to act on your behalf. It never sees your Google password.
        </p>
        <p>
          The game&apos;s use of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section>
        <h2>What&apos;s saved while you play signed in</h2>
        <ul>
          <li>
            <strong>Games:</strong> each puzzle, your board and notes, time played, mistakes, and
            hints used, so you can continue on any device and so wins can be checked.
          </li>
          <li>
            <strong>Stats:</strong> games played, won, and lost, best and average times, and streaks
            for each difficulty.
          </li>
          <li>
            <strong>Settings:</strong> your choices in Settings, such as dark board and animations.
          </li>
        </ul>
        <p>
          When you first sign in on a browser where you played as a guest, that browser&apos;s stats
          and unfinished game are moved into your account.
        </p>
        <p>
          Your information isn&apos;t shown to other players. If a public leaderboard is added
          later, this policy will be updated first to explain what it shows, and you&apos;ll be able
          to hide yourself from it.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Signing in sets a few cookies that keep you signed in and protect the sign-in process. The
          main one holds your session in encrypted form. There are no advertising or analytics
          cookies, and nothing tracks you across other websites.
        </p>
      </section>

      <section>
        <h2>Who handles your data</h2>
        <p>
          The game runs on <strong>Vercel</strong> (hosting) and stores account data in a{" "}
          <strong>Supabase</strong> database. <strong>Google</strong> handles signing in. Like most
          hosting services, they may keep standard technical logs, such as IP addresses and browser
          details, to run and protect their services. Your data isn&apos;t sold or shared with
          anyone else.
        </p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          Signed in, open <strong>Settings</strong> and choose <strong>Delete account</strong>. This
          permanently removes your account, saved games, stats, and settings from the game&apos;s
          database and signs you out. You can also remove the game&apos;s access to your Google
          account at any time from your{" "}
          <a
            href="https://myaccount.google.com/connections"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account connections
          </a>
          .
        </p>
        <p>
          Information is kept only while your account exists. Using <strong>Reset stats</strong>{" "}
          clears your stats without deleting the account.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The game isn&apos;t directed at children under 13, and accounts aren&apos;t knowingly
          created for them. Anyone can play as a guest, which stores nothing on the game&apos;s
          servers.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the date at the top will change too. For questions, or if you
          can&apos;t sign in and want your data removed, contact the developer through{" "}
          <a href="https://github.com/kurt-02" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          . See also the <Link href="/terms">terms of service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
