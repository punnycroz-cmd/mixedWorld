import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

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
    <html lang="en">
      <body className="overflow-x-hidden antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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
