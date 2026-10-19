import { getLocale, getTranslations } from "next-intl/server";
import { Check, Circle, Flag } from "lucide-react";
import type { MilestoneKind, QuotationStatus, RequestStatus } from "@/lib/domain/enums";
import { requestStatusTone } from "@/lib/domain/request-status";
import { formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export async function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const te = await getTranslations("enums");
  return <Badge tone={requestStatusTone(status)}>{te(`requestStatus.${status}`)}</Badge>;
}

export function quotationDisplayStatus(status: QuotationStatus, validUntil: string): QuotationStatus | "expired" {
  if ((status === "submitted" || status === "sent") && validUntil < new Date().toISOString().slice(0, 10)) return "expired";
  return status;
}

export async function QuotationStatusBadge({ status, validUntil }: { status: QuotationStatus; validUntil: string }) {
  const te = await getTranslations("enums");
  const s = quotationDisplayStatus(status, validUntil);
  const tone = s === "accepted" ? "success" : s === "sent" ? "warning" : s === "submitted" ? "info" : s === "expired" ? "neutral" : "danger";
  return <Badge tone={tone}>{te(`quotationStatus.${s}`)}</Badge>;
}

type HistoryEntry = { id: number; from_status: RequestStatus | null; to_status: RequestStatus; actor_role: string; note: string | null; created_at: string };
type Milestone = { id: string; kind: MilestoneKind; occurred_on: string; note: string | null; created_at: string };

/** Chronological record of recorded events only (status changes and dated milestones). */
export async function RequestTimeline({ history, milestones, showNotes = true }: {
  history: HistoryEntry[]; milestones: Milestone[]; showNotes?: boolean;
}) {
  const [te, t, locale] = await Promise.all([getTranslations("enums"), getTranslations("requests"), getLocale()]);
  const items = [
    ...history.map((h) => ({ key: `h${h.id}`, at: h.created_at, kind: "status" as const, h })),
    ...milestones.map((m) => ({ key: `m${m.id}`, at: m.created_at, kind: "milestone" as const, m })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  if (!items.length) return <p className="text-sm text-muted-foreground">{t("noHistory")}</p>;
  return (
    <ol className="relative space-y-5 border-s border-border ps-6">
      {items.map((item, i) => (
        <li key={item.key} className="relative">
          <span className="absolute -start-[31px] top-0.5 flex size-[18px] items-center justify-center rounded-full border border-border bg-surface">
            {item.kind === "milestone" ? <Flag className="size-2.5 text-primary" aria-hidden="true" />
              : i === items.length - 1 ? <Circle className="size-2 fill-primary text-primary" aria-hidden="true" />
              : <Check className="size-2.5 text-success" aria-hidden="true" />}
          </span>
          {item.kind === "status" ? (
            <div>
              <p className="text-sm font-medium">{te(`requestStatus.${item.h.to_status}`)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(item.h.created_at, locale)} · {te(`actorRole.${item.h.actor_role as "customer" | "staff" | "supplier" | "system"}`)}
              </p>
              {showNotes && item.h.note ? <p className="mt-1 text-sm text-muted-foreground">{item.h.note}</p> : null}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">{te(`milestone.${item.m.kind}`)}</p>
              <p className="text-xs text-muted-foreground">{t("occurredOn", { date: formatDate(item.m.occurred_on, locale) })}</p>
              {item.m.note ? <p className="mt-1 text-sm text-muted-foreground">{item.m.note}</p> : null}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
