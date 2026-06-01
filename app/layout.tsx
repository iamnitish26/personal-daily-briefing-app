import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Data Briefing",
  description: "Daily data engineering, AI, and Databricks certification briefing."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
