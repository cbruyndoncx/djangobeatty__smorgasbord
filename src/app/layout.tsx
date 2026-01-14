import type { Metadata } from "next";
import { Geist, Geist_Mono, Cherry_Bomb_One, M_PLUS_Rounded_1c } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Kawaii fonts for smorgasbord theme
const cherryBomb = Cherry_Bomb_One({
  variable: "--font-cherry-bomb",
  weight: "400",
  subsets: ["latin"],
});

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-mplus-rounded",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smorgasbord",
  description: "Browser-based dashboard for Gas Town",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cherryBomb.variable} ${mPlusRounded.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
