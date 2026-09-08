import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JurisAI — Legal clarity, practical next steps",
  description: "A jurisdiction-aware AI legal information and navigation assistant.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

