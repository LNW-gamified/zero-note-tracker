import type { Metadata } from "next";
import { Libre_Caslon_Text, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const libreCaslon = Libre_Caslon_Text({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "The Ledger — 0€ Note & Currency Tracker",
  description: "A personal catalog of zero-euro souvenir notes and world currency.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${libreCaslon.variable} ${plexSans.variable} ${plexMono.variable} font-body bg-paper text-ink`}
      >
        {children}
      </body>
    </html>
  );
}
