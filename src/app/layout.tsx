import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Research Daily",
  description: "A daily feed of research papers on the topic you choose.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="header-inner">
            <Link href="/" className="logo">Research Daily</Link>
            <span className="tagline">Your daily research paper</span>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <p>Research Daily is a CSCI 4050 team project at the University of Georgia.</p>
        </footer>
      </body>
    </html>
  );
}
