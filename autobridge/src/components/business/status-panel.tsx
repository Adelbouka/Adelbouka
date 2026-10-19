import { getTranslations } from "next-intl/server";
import type { BusinessStatus } from "@/lib/domain/enums";
import { resubmitApplicationAction } from "@/lib/actions/business";
import { Alert } from "@/components/ui/alert";
import { ActionForm } from "@/components/forms/action-form";

export async function BusinessStatusPanel({ kind, status, reason }: { kind: "supplier" | "partner"; status: BusinessStatus; reason: string | null }) {
  const t = await getTranslations("supplier");
  if (status === "approved") return null;
  if (status === "pending") return <Alert tone="info" title={t("statusPendingTitle")}>{t("statusPendingText")}</Alert>;
  if (status === "suspended") return <Alert tone="danger" title={t("statusSuspendedTitle")}>{reason ?? t("statusSuspendedText")}</Alert>;
  return (
    <Alert tone="danger" title={t("statusRejectedTitle")}>
      <p>{reason}</p>
      <p className="mt-1">{t("statusRejectedText")}</p>
      <ActionForm action={resubmitApplicationAction} hidden={{ kind }} submitLabel={t("resubmit")} variant="secondary" size="sm" className="mt-3" inline />
    </Alert>
  );
}
