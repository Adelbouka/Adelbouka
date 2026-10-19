"use client";
import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteDocumentAction, documentUrlAction, registerDocumentAction } from "@/lib/actions/business";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/domain/enums";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ActionForm } from "@/components/forms/action-form";

const ALLOWED: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 10 * 1024 * 1024;

type Doc = { id: string; doc_type: string; file_name: string; size_bytes: number; expires_on: string | null; created_at: string };

export function DocumentsManager({ kind, userId, documents, canUpload }: {
  kind: "supplier" | "partner"; userId: string; documents: Doc[]; canUpload: boolean;
}) {
  const t = useTranslations("supplier");
  const te = useTranslations("enums");
  const terr = useTranslations("errors");
  const tc = useTranslations("common");
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocumentType>("business_registration");
  const [expiresOn, setExpiresOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = () => {
    setError(null);
    setDone(false);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError(terr("invalid_input"));
    const ext = ALLOWED[file.type];
    if (!ext) return setError(terr("file_type"));
    if (file.size > MAX) return setError(terr("file_too_large"));
    startTransition(async () => {
      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("verification-docs").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) return setError(terr("upload_failed"));
      const res = await registerDocumentAction({
        kind, storagePath: path, fileName: file.name.slice(0, 200), mimeType: file.type as never, sizeBytes: file.size, docType, expiresOn,
      });
      if (!res.ok) return setError(terr.has(res.error ?? "unexpected") ? terr(res.error ?? "unexpected") : terr("unexpected"));
      setDone(true);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const open = (id: string) => startTransition(async () => {
    const { url } = await documentUrlAction(id);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });

  return (
    <div className="space-y-6">
      <Alert tone="info">{t("documentsPrivate")}</Alert>
      {canUpload ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="doc-type" className="mb-1 block text-sm font-medium">{t("documentType")}</label>
              <Select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
                {DOCUMENT_TYPES.map((d) => <option key={d} value={d}>{te(`documentType.${d}`)}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="doc-exp" className="mb-1 block text-sm font-medium">{t("expiresOn")} <span className="text-xs text-muted-foreground">({tc("optional")})</span></label>
              <Input id="doc-exp" type="date" dir="ltr" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </div>
            <div>
              <label htmlFor="doc-file" className="mb-1 block text-sm font-medium">{t("file")}</label>
              <Input id="doc-file" ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="pt-1.5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("fileRules")}</p>
          <Button onClick={upload} disabled={pending}><Upload className="size-4" aria-hidden="true" />{pending ? tc("loading") : t("upload")}</Button>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          {done ? <p role="status" className="text-sm text-success">{t("uploaded")}</p> : null}
        </div>
      ) : null}
      {documents.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{te(`documentType.${d.doc_type as DocumentType}`)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.file_name} · {formatDate(d.created_at, locale, "medium")}
                    {d.expires_on ? ` · ${t("expires", { date: formatDate(d.expires_on, locale, "medium") })}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => open(d.id)}>{tc("view")}</Button>
                <ActionForm action={deleteDocumentAction} hidden={{ id: d.id }} submitLabel={tc("delete")} variant="ghost" size="sm" inline confirmMessage={t("deleteDocConfirm")} />
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>}
    </div>
  );
}
