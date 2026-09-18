import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

// One rounded geometric family for everything; its digits are the heart of the board.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sudoku",
  description: "Play Sudoku in the browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink font-sans text-fg">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
