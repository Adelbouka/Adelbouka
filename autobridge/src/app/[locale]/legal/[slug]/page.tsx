import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Markdown } from "@/components/content/markdown";

const SLUGS = ["terms", "privacy", "disclosure"] as const;

const getDoc = cache(async (slug: string, locale: string) => {
  if (!(SLUGS as readonly string[]).includes(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("legal_documents").select("title, body, version, published_at")
    .eq("slug", slug).eq("locale", locale === "fr" ? "fr" : "ar").eq("is_published", true)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const doc = await getDoc(slug, locale);
  return doc ? { title: doc.title, alternates: { canonical: `/${locale}/legal/${slug}` } } : { robots: { index: false } };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const doc = await getDoc(slug, locale);
  if (!doc) notFound();
  const t = await getTranslations("pages");
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("legalVersion", { version: doc.version, date: formatDate(doc.published_at, locale) })}</p>
      <div className="mt-8"><Markdown source={doc.body} /></div>
    </article>
  );
}
