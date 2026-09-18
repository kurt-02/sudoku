import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for using this Sudoku game.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="September 18, 2026">
      <section>
        <p>
          This Sudoku game is a free personal project made by Kurt. By playing it, you agree to
          these terms. They&apos;re meant to be short and fair; if you don&apos;t agree, please
          don&apos;t use the game.
        </p>
      </section>

      <section>
        <h2>Using the game</h2>
        <p>
          You can play as a guest or sign in with a Google account. Signing in saves your games,
          stats, and settings to your account. You&apos;re responsible for your Google account; the
          game never sees your password. How your information is handled is described in the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>Play fair</h2>
        <p>When using the game, please don&apos;t:</p>
        <ul>
          <li>Use bots, scripts, or modified clients to solve puzzles or fake results or times.</li>
          <li>
            Try to get into other players&apos; accounts or data, or get around the game&apos;s
            security.
          </li>
          <li>Overload, disrupt, or attack the game or the services it runs on.</li>
        </ul>
        <p>Results that break these rules may be removed, and accounts involved may be deleted.</p>
      </section>

      <section>
        <h2>No guarantees</h2>
        <p>
          The game is provided as it is, for free, without any warranty. It may have bugs, be
          unavailable at times, or change or shut down, and saved games and stats could be lost. To
          the extent the law allows, the developer isn&apos;t liable for any loss or damage from
          using it.
        </p>
      </section>

      <section>
        <h2>Ending your use</h2>
        <p>
          You can stop playing at any time and delete your account from Settings, which removes your
          saved data.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          These terms may change as the game does; the date at the top shows the latest version.
          Questions can go to the developer through{" "}
          <a href="https://github.com/kurt-02" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
