import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KRTECH AI Business Agent",
  description: "WhatsApp AI Sales + Support + CRM + Automation platform for KRTECH.SPACE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-900 text-ink-100 antialiased">{children}</body>
    </html>
  );
}
