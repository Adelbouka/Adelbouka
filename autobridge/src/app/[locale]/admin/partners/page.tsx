import { resolveLocale } from "@/i18n/locale";
import { BusinessList } from "@/components/admin/business-list";

export default async function AdminPartners({ params, searchParams }: PageProps<"/[locale]/admin/partners">) {
  await resolveLocale(params);
  const { status } = await searchParams;
  return <BusinessList kind="partner" statusParam={status} />;
}
