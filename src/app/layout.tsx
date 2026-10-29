import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminHeader } from "@/components/admin-header";
import { SideNav } from "@/components/nav-links";
import { createClient } from "@/lib/supabase/server";
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
  title: "Humor Project Admin",
  description: "Admin area for the Humor Project database",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only superadmins see the navigation; the proxy keeps everyone else on
  // /login or /not-authorized.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("is_superadmin").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = profile?.is_superadmin === true;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AdminHeader />
        {isAdmin ? (
          <div className="flex flex-1 flex-col lg:flex-row">
            <aside className="border-b border-black/[.08] bg-white lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 dark:border-white/[.1] dark:bg-zinc-950">
              <SideNav />
            </aside>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
