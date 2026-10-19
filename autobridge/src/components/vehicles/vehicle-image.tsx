"use client";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Car silhouette shown when a photo is missing or fails to load. */
export function CarPlaceholder({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-muted to-[#e6e4de] text-muted-foreground", className)}>
      <svg viewBox="0 0 120 48" className="w-1/3 max-w-32 opacity-60" aria-hidden="true">
        <path d="M8 34c0-5 3-8 8-9l14-3 12-10c3-2 6-3 10-3h22c5 0 9 2 12 5l9 9 12 2c5 1 7 4 7 8v4c0 2-1 3-3 3h-7a10 10 0 0 0-20 0H43a10 10 0 0 0-20 0h-12c-2 0-3-1-3-3z" fill="currentColor" />
        <circle cx="33" cy="40" r="7" fill="currentColor" />
        <circle cx="94" cy="40" r="7" fill="currentColor" />
      </svg>
      {label ? <span className="text-xs">{label}</span> : null}
    </div>
  );
}

export function VehicleImage({ src, alt, sizes, preload, className }: {
  src: string | null; alt: string; sizes: string; preload?: boolean; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const t = useTranslations("common");
  if (!src || failed) return <CarPlaceholder className={className} label={t("imageUnavailable")} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
