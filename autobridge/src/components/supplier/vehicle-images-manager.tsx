"use client";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerVehicleImageAction, vehicleImageOpAction } from "@/lib/actions/supplier";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/forms/action-form";
import { VehicleImage } from "@/components/vehicles/vehicle-image";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 5 * 1024 * 1024;

export function VehicleImagesManager({ vehicleId, userId, images }: {
  vehicleId: string; userId: string; images: { id: string; url: string | null; position: number }[];
}) {
  const t = useTranslations("supplier");
  const terr = useTranslations("errors");
  const tc = useTranslations("common");
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = () => {
    setError(null);
    const files = Array.from(ref.current?.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 20) return setError(terr("too_many_images"));
    for (const f of files) {
      if (!TYPES[f.type]) return setError(terr("file_type"));
      if (f.size > MAX) return setError(terr("file_too_large"));
    }
    startTransition(async () => {
      const supabase = createClient();
      for (const file of files) {
        const path = `${userId}/${vehicleId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
        const { error: upErr } = await supabase.storage.from("vehicle-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
        if (upErr) return setError(terr("upload_failed"));
        const res = await registerVehicleImageAction({ vehicleId, storagePath: path });
        if (!res.ok) return setError(terr.has(res.error ?? "unexpected") ? terr(res.error ?? "unexpected") : terr("unexpected"));
      }
      if (ref.current) ref.current.value = "";
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label={t("choosePhotos")} className="max-w-full text-sm" />
        <Button variant="secondary" onClick={upload} disabled={pending}><ImagePlus className="size-4" aria-hidden="true" />{pending ? tc("loading") : t("uploadPhotos")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("photoRules")}</p>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="relative aspect-[4/3] bg-surface-muted">
                <VehicleImage src={img.url} alt="" sizes="240px" />
                {i === 0 ? <Badge tone="primary" className="absolute start-2 top-2 bg-surface">{t("cover")}</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-1 p-2">
                {i !== 0 ? <ActionForm action={vehicleImageOpAction} hidden={{ imageId: img.id, op: "cover" }} submitLabel={t("makeCover")} variant="ghost" size="sm" inline /> : null}
                <ActionForm action={vehicleImageOpAction} hidden={{ imageId: img.id, op: "delete" }} submitLabel={tc("delete")} variant="ghost" size="sm" inline />
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>}
    </div>
  );
}
