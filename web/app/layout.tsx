import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexus Agent",
  description: "AI-driven orchestration for enterprise SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f1115", color: "#e6e8eb" }}>
        <header style={{ padding: "14px 20px", borderBottom: "1px solid #30363d", background: "#0f1115" }}>
          <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <a href="/" style={{ color: "#e6e8eb", textDecoration: "none", fontWeight: 700 }}>
              Run
            </a>
            <a href="/history" style={{ color: "#e6e8eb", textDecoration: "none", fontWeight: 700, opacity: 0.85 }}>
              History
            </a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
