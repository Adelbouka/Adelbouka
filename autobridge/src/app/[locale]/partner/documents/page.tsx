import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyPartner } from "@/lib/queries/business";
import { PageHeader } from "@/components/ui/misc";
import { DocumentsManager } from "@/components/business/documents-manager";

export default async function PartnerDocuments({ params }: PageProps<"/[locale]/partner/documents">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/partner/documents");
  const p = await getMyPartner(viewer.id);
  if (!p) redirect({ href: "/partner/apply", locale });
  const supabase = await createClient();
  const [t, { data }] = await Promise.all([
    getTranslations("supplier"),
    supabase.from("verification_documents").select("id, doc_type, file_name, size_bytes, expires_on, created_at").eq("partner_id", p!.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <PageHeader title={t("navDocuments")} description={t("documentsSubtitle")} />
      <DocumentsManager kind="partner" userId={viewer.id} documents={data ?? []} canUpload={p!.status !== "suspended"} />
    </div>
  );
}
