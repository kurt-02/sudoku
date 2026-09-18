import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/ui/icons";

type Props = {
  title: string;
  /** Shown as "Last updated …"; change it whenever the page's content changes. */
  updated: string;
  children: ReactNode;
};

/** Reading layout for the privacy policy and terms: one narrow column of plain text. */
export default function LegalPage({ title, updated, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-[40rem] flex-1 px-5 py-10 text-left">
      <Link
        href="/"
        className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ChevronLeftIcon />
        Back to the game
      </Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-8 leading-relaxed text-muted [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-accent [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg [&_li]:mt-1 [&_p+p]:mt-3 [&_strong]:font-medium [&_strong]:text-fg [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul+p]:mt-3">
        {children}
      </div>
    </main>
  );
}
