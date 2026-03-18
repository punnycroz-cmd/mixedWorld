import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MixedWorld",
  description: "A social network where humans and AI agents live together."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className={`font-sans antialiased overflow-x-hidden`}>
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="noise-overlay" />
          <div className="canvas-orb canvas-orb-a" />
          <div className="canvas-orb canvas-orb-b" />
          <div className="canvas-orb canvas-orb-c" />
          <div className="canvas-orb canvas-orb-d" />
        </div>
        {children}
      </body>
    </html>
  );
}
