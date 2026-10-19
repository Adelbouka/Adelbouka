import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { BusinessReview } from "@/components/admin/business-review";

export default async function AdminSupplier({ params }: PageProps<"/[locale]/admin/suppliers/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  const { data: s } = await supabase.from("supplier_profiles").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [t, te, listings] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"),
    supabase.from("vehicles").select("status").eq("supplier_id", id),
  ]);
  const counts = (listings.data ?? []).reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {});
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<Link href="/admin/suppliers" className="hover:text-foreground">← {t("navSuppliers")}</Link>} title={s.business_name} />
      <BusinessReview kind="supplier" business={s} isAdmin={viewer.isAdmin} extra={
        <Card>
          <CardHeader title={t("listings")} />
          <CardBody className="flex flex-wrap gap-4 text-sm">
            {Object.entries(counts).length ? Object.entries(counts).map(([k, n]) => (
              <span key={k}>{te(`listingStatus.${k as "draft"}`)}: <span className="font-semibold ltr-nums">{n}</span></span>
            )) : <span className="text-muted-foreground">{t("noResults")}</span>}
          </CardBody>
        </Card>
      } />
    </div>
  );
}
