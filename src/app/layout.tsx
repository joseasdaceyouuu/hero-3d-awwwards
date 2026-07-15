import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LenisProvider } from "@/components/providers/LenisProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "SILENT LIGHT — Volumetric Fog Hero",
  description:
    "Atmospheric cinematic hero with volumetric fog, god rays, and emergent typography. Blade Runner 2049 inspired. Built with the hero-3d-awwwards skill.",
  keywords: [
    "Awwwards",
    "volumetric fog",
    "god rays",
    "atmospheric",
    "cinematic",
    "WebGL",
    "shaders",
    "React Three Fiber",
  ],
  authors: [{ name: "hero-3d-awwwards skill v5" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
        style={{ background: "#05050a", color: "#f5e6d3" }}
      >
        <LenisProvider>{children}</LenisProvider>
        <Toaster />
      </body>
    </html>
  );
}
