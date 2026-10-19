"use client";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type PortalNavItem = { href: string; label: string; badge?: number };

export function PortalShell({ title, nav, children }: { title: string; nav: PortalNavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== nav[0]?.href && pathname.startsWith(`${href}/`));
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
        <nav aria-label={title} className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                isActive(item.href) ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {item.label}
              {item.badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white ltr-nums">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
