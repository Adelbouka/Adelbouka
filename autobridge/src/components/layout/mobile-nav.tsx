"use client";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface-muted"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>
      {open ? (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface px-4 pb-4 shadow-lg"
          onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
