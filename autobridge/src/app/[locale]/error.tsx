"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t("errorTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("errorText")}</p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground ltr-nums">ref: {error.digest}</p> : null}
      <Button className="mt-6" onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
