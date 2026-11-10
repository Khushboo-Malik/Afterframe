import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "AfterFrame — turn travel vlogs into maps", template: "%s · AfterFrame" },
  description:
    "Paste a travel vlog link. AfterFrame watches it, checks every place on Google Maps, and gives you a map with a timestamp for each spot.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#151d23" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
