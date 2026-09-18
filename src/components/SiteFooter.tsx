/** Shown at the bottom of every page. */
export default function SiteFooter() {
  return (
    <footer className="px-5 pt-2 pb-6 text-center text-sm text-muted">
      Made by{" "}
      <a
        href="https://github.com/kurt-02"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm font-medium text-fg underline-offset-4 transition-colors duration-150 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Kurt
      </a> {" "}
      with Claude Code :)
    </footer>
  );
}
