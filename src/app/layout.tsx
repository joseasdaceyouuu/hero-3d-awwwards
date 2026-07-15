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
  title: "FLUX — Creative Hero",
  description:
    "Awwwards-level hero section with animated shader background, cinematic typography, and mouse-driven parallax. Built with the hero-3d-awwwards skill.",
  keywords: [
    "Awwwards",
    "hero section",
    "3D web",
    "WebGL",
    "shaders",
    "GSAP",
    "React Three Fiber",
  ],
  authors: [{ name: "hero-3d-awwwards skill" }],
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
        style={{ background: "#05050f", color: "#ffffff" }}
      >
        <LenisProvider>{children}</LenisProvider>
        <Toaster />
      </body>
    </html>
  );
}
