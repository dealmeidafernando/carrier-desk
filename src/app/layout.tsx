import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { getPublicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const { appName, appDescription } = getPublicEnv();
const metadataTitle = appName || "HappyRobot Custom App";
const metadataDescription =
  appDescription || "Custom app built with HappyRobot.";

export const metadata: Metadata = {
  title: metadataTitle,
  description: metadataDescription,
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: metadataTitle,
    description: metadataDescription,
  },
  twitter: {
    card: "summary",
    title: metadataTitle,
    description: metadataDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}
