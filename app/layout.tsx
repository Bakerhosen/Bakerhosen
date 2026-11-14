import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Roundtable — Make a plan, together",
  description: "A place. A time. Everyone on the same page.",
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/" className="brand">
            <span className="logo">◌</span> roundtable
            <span className="brand-dot">.</span>
          </Link>
          <span className="header-note">GOOD COMPANY. LESS PLANNING.</span>
        </header>
        {children}
        <footer>
          <span>One plan. Everyone together.</span>
          <span>Made for the group chat ↗</span>
        </footer>
      </body>
    </html>
  );
}
