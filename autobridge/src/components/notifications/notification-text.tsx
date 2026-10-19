import { getTranslations } from "next-intl/server";
import type { Json } from "@/lib/supabase/database.types";

type Params = Record<string, string | number | null>;

/** Renders a notification from its type and parameters in the reader's language. */
export async function notificationText(type: string, params: Json, locale?: "ar" | "fr"): Promise<string> {
  const [t, te] = locale
    ? await Promise.all([getTranslations({ locale, namespace: "account" }), getTranslations({ locale, namespace: "enums" })])
    : await Promise.all([getTranslations("account"), getTranslations("enums")]);
  const p = (params && typeof params === "object" && !Array.isArray(params) ? params : {}) as Params;
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) values[k] = v == null ? "" : String(v);
  if (p.status && typeof p.status === "string") {
    const key = `requestStatus.${p.status}` as Parameters<typeof te>[0];
    const skey = `serviceStatus.${p.status}` as Parameters<typeof te>[0];
    values.status = te.has(key) ? te(key) : te.has(skey) ? te(skey) : String(p.status);
  }
  if (p.kind && typeof p.kind === "string") {
    const key = `milestone.${p.kind}` as Parameters<typeof te>[0];
    const dkey = `dataRequestKind.${p.kind}` as Parameters<typeof te>[0];
    values.kind = te.has(key) ? te(key) : te.has(dkey) ? te(dkey) : String(p.kind);
  }
  if (p.decision && typeof p.decision === "string") {
    const key = `legalReview.${p.decision}` as Parameters<typeof te>[0];
    values.decision = te.has(key) ? te(key) : String(p.decision);
  }
  if (p.reason && typeof p.reason === "string") {
    const key = `reportReason.${p.reason}` as Parameters<typeof te>[0];
    if (te.has(key)) values.reason = te(key);
  }
  for (const k of ["reference", "quotation", "name", "slug", "reason"]) values[k] ??= "";
  const key = `notificationTypes.${type}` as Parameters<typeof t>[0];
  return t.has(key) ? t(key, values as never) : t("notificationTypes.generic");
}
