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
  title: "COSMIC RESONANCE — Generative Hero",
  description:
    "Awwwards-level hero with curl noise shader, 2000 GPU particles, and SVG-distorted typography that reacts to your cursor. Built with the hero-3d-awwwards skill.",
  keywords: [
    "Awwwards",
    "hero section",
    "3D web",
    "WebGL",
    "shaders",
    "curl noise",
    "particles",
    "GSAP",
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
        style={{ background: "#030014", color: "#ffffff" }}
      >
        <LenisProvider>{children}</LenisProvider>
        <Toaster />
      </body>
    </html>
  );
}
