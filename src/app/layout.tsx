import type { Metadata } from "next";
import { TauriAppWindowProvider } from "../tauri-controls/contexts/plugin-window";
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
      <body>
        <TauriAppWindowProvider>{children}</TauriAppWindowProvider>
      </body>
    </html>
  );
}
