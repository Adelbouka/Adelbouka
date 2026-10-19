"use client";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toggleFavoriteAction } from "@/lib/actions/listing-interactions";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({ vehicleId, slug, initial, signedIn }: {
  vehicleId: string; slug: string; initial: boolean; signedIn: boolean;
}) {
  const t = useTranslations("vehicles");
  const locale = useLocale();
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  if (!signedIn) {
    return (
      <Link href={{ pathname: "/auth/sign-in", query: { next: `/${locale}/vehicles/${slug}` } }} className={buttonClasses("secondary", "md", "w-full")}>
        <Heart className="size-4" aria-hidden="true" />{t("signInToSave")}
      </Link>
    );
  }
  return (
    <Button
      variant="secondary"
      className="w-full"
      aria-pressed={saved}
      disabled={pending}
      onClick={() => {
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          const res = await toggleFavoriteAction(vehicleId, next);
          if (!res.ok) setSaved(!next);
        });
      }}
    >
      <Heart className={cn("size-4", saved && "fill-accent text-accent")} aria-hidden="true" />
      {saved ? t("removeFavorite") : t("saveFavorite")}
    </Button>
  );
}
