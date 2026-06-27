import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TauriAppWindowProvider } from "../tauri-controls/contexts/plugin-window";
import { Gate } from "../components/gate";
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
  // The hosted demo is private — keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <TauriAppWindowProvider>
          <Gate>{children}</Gate>
        </TauriAppWindowProvider>
      </body>
    </html>
  );
}
