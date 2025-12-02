import type { Metadata } from "next";
import { Providers } from '@/components/providers'
import "./globals.css";

export const metadata: Metadata = {
  title: "Nawaitu (Nagawa Antrian Untukmu)",
  description: "Queue Management System for Service Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}