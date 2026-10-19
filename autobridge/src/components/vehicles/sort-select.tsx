"use client";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SORTS, type Sort } from "@/lib/marketplace-filters";
import { Select } from "@/components/ui/input";

export function SortSelect({ value }: { value: Sort }) {
  const t = useTranslations("vehicles");
  const te = useTranslations("enums");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm whitespace-nowrap text-muted-foreground">{t("sortBy")}</label>
      <Select
        id="sort"
        className="w-auto"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "newest") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          router.push({ pathname, query: Object.fromEntries(next.entries()) });
        }}
      >
        {SORTS.map((s) => <option key={s} value={s}>{te(`sort.${s}`)}</option>)}
      </Select>
    </div>
  );
}
