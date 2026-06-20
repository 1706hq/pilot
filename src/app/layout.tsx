import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TauriAppWindowProvider } from "../tauri-controls/contexts/plugin-window";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pilot",
  description: "A Next.js and Tauri application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <TauriAppWindowProvider>{children}</TauriAppWindowProvider>
      </body>
    </html>
  );
}
