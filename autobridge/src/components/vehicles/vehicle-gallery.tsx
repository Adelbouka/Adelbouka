"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { VehicleImage } from "./vehicle-image";

export function VehicleGallery({ images, title, illustrative }: {
  images: { url: string | null; alt: string }[]; title: string; illustrative: boolean;
}) {
  const t = useTranslations("vehicles");
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <section aria-label={t("gallery")}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-muted">
        <VehicleImage key={active} src={current?.url ?? null} alt={current?.alt || title} sizes="(min-width: 1024px) 760px, 100vw" preload={active === 0} />
        {images.length > 1 ? (
          <span className="absolute bottom-3 end-3 rounded-md bg-foreground/70 px-2 py-0.5 text-xs text-white ltr-nums">
            {active + 1} / {images.length}
          </span>
        ) : null}
      </div>
      {illustrative ? <p className="mt-2 text-xs text-warning">{t("illustrativePhotos")}</p> : null}
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={t("photoOf", { index: i + 1, total: images.length })}
                aria-current={i === active}
                className={cn("relative block aspect-[4/3] w-full overflow-hidden rounded-lg border-2 bg-surface-muted", i === active ? "border-primary" : "border-transparent opacity-80 hover:opacity-100")}
              >
                <VehicleImage src={img.url} alt="" sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
