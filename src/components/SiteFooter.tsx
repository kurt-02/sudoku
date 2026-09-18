import Link from "next/link";

const LINK =
  "rounded-sm transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Shown at the bottom of every page. */
export default function SiteFooter() {
  return (
    <footer className="px-5 pt-2 pb-6 text-center text-sm text-muted">
      <p>
        Made by{" "}
        <a
          href="https://kurt-valderama.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-medium text-fg underline-offset-4 transition-colors duration-150 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Kurt
        </a>{" "}
        with Claude Code :)
      </p>
      <nav aria-label="Legal" className="mt-1.5 flex justify-center gap-4 text-xs">
        <Link href="/privacy" className={LINK}>
          Privacy
        </Link>
        <Link href="/terms" className={LINK}>
          Terms
        </Link>
      </nav>
    </footer>
  );
}
