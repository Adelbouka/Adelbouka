"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES } from "@/lib/domain/enums";
import { businessProfileSchema, partnerExtraSchema } from "@/lib/validation/business";
import { localeSchema } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

type Kind = "supplier" | "partner";

function profileRow(v: z.infer<typeof businessProfileSchema>) {
  return {
    business_name: v.businessName,
    legal_form: v.legalForm ?? null,
    registration_number: v.registrationNumber ?? null,
    country_code: v.countryCode,
    city: v.city,
    contact_name: v.contactName,
    contact_email: v.contactEmail,
    contact_phone: v.contactPhone,
    website: v.website ?? null,
    description: v.description ?? null,
  };
}

function readPartnerExtras(formData: FormData) {
  return partnerExtraSchema.safeParse({
    categories: formData.getAll("categories").map(String),
    operatingCountries: formData.getAll("operatingCountries").map(String),
  });
}

/** Creates (apply) or updates the caller's own supplier/partner profile. */
export async function saveBusinessProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const kind: Kind = formData.get("kind") === "partner" ? "partner" : "supplier";
  const locale = localeSchema.parse(formData.get("locale"));
  const values = {
    ...formValues(formData),
    // Multi-value fields are echoed so the form can be restored after a validation error.
    categories: formData.getAll("categories").map(String).join(","),
    operatingCountries: formData.getAll("operatingCountries").map(String).join(","),
  };
  const parsed = businessProfileSchema.safeParse(values);
  const extras = kind === "partner" ? readPartnerExtras(formData) : null;
  if (!parsed.success) return fromZodError(parsed.error, values);
  if (extras && !extras.success) return fromZodError(extras.error, values);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const base = profileRow(parsed.data);
  let id: string | undefined;
  let created = false;
  if (kind === "supplier") {
    const row = { ...base, address: parsed.data.address ?? null, services_offered: parsed.data.servicesOffered ?? null };
    const { data: existing } = await supabase.from("supplier_profiles").select("id").eq("owner_id", user.id).maybeSingle();
    const { data, error } = existing
      ? await supabase.from("supplier_profiles").update(row).eq("id", existing.id).select("id").single()
      : await supabase.from("supplier_profiles").insert({ ...row, owner_id: user.id }).select("id").single();
    if (error || !data) return fromDbError(error);
    id = data.id;
    created = !existing;
  } else {
    const row = { ...base, operating_countries: extras?.success ? extras.data.operatingCountries : [] };
    const { data: existing } = await supabase.from("partner_profiles").select("id").eq("owner_id", user.id).maybeSingle();
    const { data, error } = existing
      ? await supabase.from("partner_profiles").update(row).eq("id", existing.id).select("id").single()
      : await supabase.from("partner_profiles").insert({ ...row, owner_id: user.id }).select("id").single();
    if (error || !data) return fromDbError(error);
    id = data.id;
    created = !existing;
  }

  if (kind === "partner" && extras?.success && id) {
    await supabase.from("partner_service_categories").delete().eq("partner_id", id);
    const { error } = await supabase.from("partner_service_categories").insert(
      extras.data.categories.map((c) => ({ partner_id: id!, category_code: c })),
    );
    if (error) return fromDbError(error);
  }
  revalidatePath(`/[locale]/${kind}`, "layout");
  if (created) redirect(`/${locale}/${kind}?applied=1`);
  return { ok: true };
}

export async function resubmitApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const kind: Kind = formData.get("kind") === "partner" ? "partner" : "supplier";
  const supabase = await createClient();
  const { error } = await supabase.rpc("resubmit_business_application", { p_kind: kind });
  if (error) return fromDbError(error);
  revalidatePath(`/[locale]/${kind}`, "layout");
  return { ok: true };
}

const MAX_DOC = 10 * 1024 * 1024;
const docSchema = z.object({
  kind: z.enum(["supplier", "partner"]),
  storagePath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(MAX_DOC),
  docType: z.enum(DOCUMENT_TYPES),
  expiresOn: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

/** Registers a document already uploaded by the browser into the private bucket. */
export async function registerDocumentAction(input: z.input<typeof docSchema>): Promise<ActionState> {
  const parsed = docSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !v.storagePath.startsWith(`${user.id}/`)) return { ok: false, error: "forbidden" };
  const table = v.kind === "supplier" ? "supplier_profiles" : "partner_profiles";
  const { data: owner } = await supabase.from(table).select("id").eq("owner_id", user.id).maybeSingle();
  if (!owner) return { ok: false, error: "forbidden" };
  // Confirm the object really exists in storage with the declared size.
  const { data: info } = await supabase.storage.from("verification-docs").info(v.storagePath);
  if (!info || (info.size != null && info.size > MAX_DOC)) return { ok: false, error: "upload_failed" };
  const { error } = await supabase.from("verification_documents").insert({
    supplier_id: v.kind === "supplier" ? owner.id : null,
    partner_id: v.kind === "partner" ? owner.id : null,
    uploaded_by: user.id,
    doc_type: v.docType,
    storage_path: v.storagePath,
    file_name: v.fileName,
    mime_type: v.mimeType,
    size_bytes: v.sizeBytes,
    expires_on: v.expiresOn ?? null,
  });
  if (error) {
    await supabase.storage.from("verification-docs").remove([v.storagePath]);
    return fromDbError(error);
  }
  revalidatePath(`/[locale]/${v.kind}/documents`, "page");
  return { ok: true };
}

export async function deleteDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("verification_documents").select("id, storage_path, supplier_id").eq("id", id.data).maybeSingle();
  if (!doc) return { ok: false, error: "not_found" };
  const { error } = await supabase.from("verification_documents").delete().eq("id", doc.id);
  if (error) return fromDbError(error);
  await supabase.storage.from("verification-docs").remove([doc.storage_path]);
  revalidatePath(`/[locale]/${doc.supplier_id ? "supplier" : "partner"}/documents`, "page");
  return { ok: true };
}

/** Short-lived signed URL so an owner or staff member can open a private document. */
export async function documentUrlAction(id: string): Promise<{ url: string | null }> {
  if (!z.uuid().safeParse(id).success) return { url: null };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("verification_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return { url: null };
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(doc.storage_path, 60);
  return { url: data?.signedUrl ?? null };
}
