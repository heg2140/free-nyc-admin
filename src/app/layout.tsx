import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminHeader } from "@/components/admin-header";
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
  title: "Free NYC Admin",
  description: "Admin area for the Free NYC app",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AdminHeader />
        {children}
      </body>
    </html>
  );
}
