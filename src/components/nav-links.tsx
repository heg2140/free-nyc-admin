"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESOURCE_GROUPS, RESOURCES } from "@/lib/resources";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={
        active
          ? "block rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "block rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </Link>
  );
}

export function SideNav() {
  return (
    <nav className="flex gap-6 overflow-x-auto px-4 py-4 lg:flex-col lg:gap-5 lg:overflow-visible">
      <div>
        <NavLink href="/" label="Stats" />
      </div>
      {RESOURCE_GROUPS.map((group) => (
        <div key={group} className="shrink-0">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {group}
          </p>
          <div className="flex gap-1 lg:flex-col">
            {RESOURCES.filter((r) => r.group === group).map((r) => (
              <NavLink key={r.slug} href={`/${r.slug}`} label={r.title} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
