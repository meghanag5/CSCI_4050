import Link from "next/link";
import { getUserDoc } from "@/lib/auth";
import "./globals.css";

export const metadata = {
  title: "Research Daily",
  description: "A daily feed of research papers on the topic you choose.",
};

async function currentName() {
  // A missing or unreachable database shouldn't take the whole site down.
  try {
    return (await getUserDoc())?.name ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const name = await currentName();

  return (
    <html lang="en">
      <body>
        <header>
          <div className="header-inner">
            <Link href="/" className="logo">Research Daily</Link>
            <nav className="nav">
              <span className="tagline">Your daily research paper</span>
              {name ? (
                <Link href="/profile" className="nav-link">{name.split(" ")[0]}&apos;s profile</Link>
              ) : (
                <Link href="/login" className="nav-link">Log in</Link>
              )}
            </nav>
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
