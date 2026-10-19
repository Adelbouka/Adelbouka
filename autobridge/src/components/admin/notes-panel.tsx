import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { addNoteAction } from "@/lib/actions/admin";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

type Entity = "supplier" | "partner" | "purchase_request" | "vehicle" | "service_request" | "user" | "report";

/** Internal staff notes. Never visible to customers, suppliers or partners (RLS). */
export async function NotesPanel({ entityType, entityId }: { entityType: Entity; entityId: string }) {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const supabase = await createClient();
  const { data } = await supabase.from("admin_notes").select("id, body, created_at, profiles(full_name, email)").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false });
  return (
    <Card>
      <CardHeader title={t("internalNotes")} description={t("internalNotesHint")} />
      <CardBody className="space-y-4">
        <ActionForm action={addNoteAction} hidden={{ entityType, entityId }} submitLabel={t("addNote")} variant="secondary" size="sm">
          <Textarea name="body" rows={2} maxLength={4000} aria-label={t("addNote")} required />
        </ActionForm>
        {data?.length ? (
          <ul className="space-y-3">
            {data.map((n) => (
              <li key={n.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                <p className="whitespace-pre-line">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.profiles?.full_name ?? n.profiles?.email ?? "—"} · {formatDateTime(n.created_at, locale)}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
