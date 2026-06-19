import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
