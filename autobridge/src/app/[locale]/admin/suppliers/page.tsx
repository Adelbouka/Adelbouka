import { resolveLocale } from "@/i18n/locale";
import { BusinessList } from "@/components/admin/business-list";

export default async function AdminSuppliers({ params, searchParams }: PageProps<"/[locale]/admin/suppliers">) {
  await resolveLocale(params);
  const { status } = await searchParams;
  return <BusinessList kind="supplier" statusParam={status} />;
}
