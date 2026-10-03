import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

import { WEB_BASE_URL } from "@bookflow/shared";

// Urbanist replaced Plus Jakarta Sans on 2026-10-03 (docs/design/README.md).
const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  // The "Ready for a fresh look?" bar is italic in the originals.
  style: ["normal", "italic"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(WEB_BASE_URL),
  title: "Bookflow",
  description: "Book your next salon visit.",
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
