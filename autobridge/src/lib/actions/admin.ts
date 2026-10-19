"use server";
/**
 * Administration actions. Each call runs under the signed-in user's session; the database
 * (RLS policies and SECURITY DEFINER functions that check private.is_staff()/is_admin())
 * is the authority, so these actions are safe even if a non-staff user calls them.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  BUSINESS_STATUSES, MILESTONE_KINDS, VERIFICATION_CHECKS, VERIFICATION_RESULTS,
} from "@/lib/domain/enums";
import { checkbox, currencyCode, optionalText, optionalUrl, requiredNumber, requiredText, uuid } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

const revalidateAdmin = () => revalidatePath("/[locale]/admin", "layout");

async function run(fn: (supabase: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { message?: string; code?: string } | null }>): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await fn(supabase);
  if (error) return fromDbError(error);
  revalidateAdmin();
  return { ok: true };
}

function parse<T extends z.ZodType>(schema: T, formData: FormData): { ok: true; data: z.infer<T> } | { ok: false; state: ActionState } {
  const values = formValues(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, state: fromZodError(parsed.error, values) };
  return { ok: true, data: parsed.data };
}

// ----------------------------------------------------------------------------- requests
export async function assignRequestAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ requestId: uuid, staffId: z.preprocess((v) => (v === "" ? null : v), uuid.nullable()) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("assign_purchase_request", { p_request_id: r.data.requestId, p_staff_id: r.data.staffId as string }));
}

export async function setRequestSupplierAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ requestId: uuid, supplierId: z.preprocess((v) => (v === "" ? null : v), uuid.nullable()) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("set_request_supplier", { p_request_id: r.data.requestId, p_supplier_id: r.data.supplierId as string }));
}

export async function legalReviewAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ requestId: uuid, decision: z.enum(["approved", "blocked", "pending"]), note: requiredText(2000) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("record_legal_review", { p_request_id: r.data.requestId, p_decision: r.data.decision, p_note: r.data.note }));
}

export async function sendQuotationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ quotationId: uuid, message: optionalText(2000) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("send_quotation", { p_quotation_id: r.data.quotationId, p_message: r.data.message ?? undefined }));
}

export async function rejectQuotationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ quotationId: uuid, reason: requiredText(1000) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("reject_quotation", { p_quotation_id: r.data.quotationId, p_reason: r.data.reason }));
}

export async function recordMilestoneAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    requestId: uuid, kind: z.enum(MILESTONE_KINDS), occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "invalid_date" }),
    note: optionalText(1000), evidence: optionalText(300),
  }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("request_milestones").insert({
    request_id: r.data.requestId, kind: r.data.kind, occurred_on: r.data.occurredOn,
    note: r.data.note ?? null, evidence_reference: r.data.evidence ?? null, recorded_by: user.id,
  });
  if (error) return fromDbError(error);
  revalidateAdmin();
  return { ok: true };
}

const NOTE_ENTITIES = ["supplier", "partner", "purchase_request", "vehicle", "service_request", "user", "report"] as const;
export async function addNoteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ entityType: z.enum(NOTE_ENTITIES), entityId: uuid, body: requiredText(4000) }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("admin_notes").insert({ entity_type: r.data.entityType, entity_id: r.data.entityId, body: r.data.body, author_id: user.id });
  if (error) return fromDbError(error);
  revalidateAdmin();
  return { ok: true };
}

export async function createServiceRequestAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    purchaseRequestId: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
    partnerId: uuid, categoryCode: z.string().regex(/^[a-z_]+$/), description: requiredText(3000, 10),
  }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.from("service_requests").insert({
    purchase_request_id: r.data.purchaseRequestId ?? null, partner_id: r.data.partnerId,
    category_code: r.data.categoryCode, description: r.data.description,
  }));
}

export async function decideServiceQuoteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ quoteId: uuid, decision: z.enum(["accept", "decline"]) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("decide_service_quote", { p_quote_id: r.data.quoteId, p_accept: r.data.decision === "accept" }));
}

// ----------------------------------------------------------------------------- listings
export async function reviewVehicleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ vehicleId: uuid, decision: z.enum(["approve", "reject", "archive"]), reason: optionalText(1000) }), fd);
  if (!r.ok) return r.state;
  const res = await run((s) => s.rpc("admin_review_vehicle", { p_vehicle_id: r.data.vehicleId, p_decision: r.data.decision, p_reason: r.data.reason ?? undefined }));
  revalidatePath("/[locale]/vehicles", "layout");
  return res;
}

export async function archiveExpiredAction(): Promise<ActionState> {
  return run((s) => s.rpc("admin_archive_expired_listings"));
}

export async function setPromotionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ vehicleId: uuid, until: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("admin_set_promotion", { p_vehicle_id: r.data.vehicleId, p_until: r.data.until ? `${r.data.until}T23:59:59Z` : (null as unknown as string) }));
}

export async function resolveReportAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ reportId: uuid, status: z.enum(["reviewing", "resolved", "dismissed"]), note: optionalText(2000) }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const done = r.data.status !== "reviewing";
  return run((s) => s.from("listing_reports").update({
    status: r.data.status, resolution_note: r.data.note ?? null,
    resolved_by: done ? user?.id ?? null : null, resolved_at: done ? new Date().toISOString() : null,
  }).eq("id", r.data.reportId));
}

// ----------------------------------------------------------------------------- suppliers & partners
export async function setBusinessStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ kind: z.enum(["supplier", "partner"]), id: uuid, status: z.enum(BUSINESS_STATUSES), reason: optionalText(1000) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("admin_set_business_status", { p_kind: r.data.kind, p_id: r.data.id, p_status: r.data.status, p_reason: r.data.reason ?? undefined }));
}

export async function recordVerificationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    kind: z.enum(["supplier", "partner"]), id: uuid, checkType: z.enum(VERIFICATION_CHECKS), result: z.enum(VERIFICATION_RESULTS),
    method: requiredText(300, 2), notes: optionalText(2000),
    evidenceDocumentId: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
    expiresAt: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("supplier_verification_records").insert({
    supplier_id: r.data.kind === "supplier" ? r.data.id : null,
    partner_id: r.data.kind === "partner" ? r.data.id : null,
    check_type: r.data.checkType, result: r.data.result, method: r.data.method, notes: r.data.notes ?? null,
    evidence_document_id: r.data.evidenceDocumentId ?? null,
    expires_at: r.data.expiresAt ? `${r.data.expiresAt}T23:59:59Z` : null,
    verified_by: user.id,
  });
  if (error) return fromDbError(error);
  revalidateAdmin();
  revalidatePath("/[locale]/vehicles", "layout");
  return { ok: true };
}

// ----------------------------------------------------------------------------- cost configuration
export async function addExchangeRateAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    base: currencyCode, quote: currencyCode, rate: requiredNumber(0.00000001, 1_000_000, false),
    source: requiredText(300, 2), sourceUrl: optionalUrl, effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "invalid_date" }),
    notes: optionalText(1000),
  }), fd);
  if (!r.ok) return r.state;
  if (r.data.base === r.data.quote) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("exchange_rates").insert({
    base_currency: r.data.base, quote_currency: r.data.quote, rate: r.data.rate, source: r.data.source,
    source_url: r.data.sourceUrl ?? null, effective_date: r.data.effectiveDate, notes: r.data.notes ?? null, recorded_by: user.id,
  });
  if (error) return fromDbError(error);
  revalidateAdmin();
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

export async function upsertCurrencyAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ code: currencyCode, nameAr: requiredText(60), nameFr: requiredText(60), symbol: requiredText(8), isActive: checkbox }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.from("currencies").upsert({ code: r.data.code, name_ar: r.data.nameAr, name_fr: r.data.nameFr, symbol: r.data.symbol, is_active: r.data.isActive }));
}

export async function cloneRuleSetAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ sourceId: z.preprocess((v) => (v === "" ? null : v), uuid.nullable()), title: requiredText(160, 2) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("clone_cost_rule_set", { p_source_id: r.data.sourceId as string, p_title: r.data.title }));
}

export async function activateRuleSetAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ ruleSetId: uuid }), fd);
  if (!r.ok) return r.state;
  const res = await run((s) => s.rpc("activate_cost_rule_set", { p_rule_set_id: r.data.ruleSetId }));
  revalidatePath("/[locale]", "layout");
  return res;
}

export async function deleteRuleSetAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ ruleSetId: uuid }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.from("cost_rule_sets").delete().eq("id", r.data.ruleSetId).eq("status", "draft"));
}

export async function addRuleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    ruleSetId: uuid,
    code: z.string().regex(/^[a-z_]{2,40}$/, { error: "invalid_input" }),
    kind: z.enum(["domestic_transport", "international_shipping", "insurance", "inspection", "taxes_and_customs", "documentation_admin", "platform_service_fee", "partner_service_fee", "other"]),
    labelAr: requiredText(120), labelFr: requiredText(120),
    method: z.enum(["fixed", "percent_of_price", "quote_required"]),
    amount: z.preprocess((v) => (v === "" ? undefined : Number(String(v).replace(",", "."))), z.number().min(0).optional()),
    currency: z.preprocess((v) => (v === "" ? undefined : v), currencyCode.optional()),
    percent: z.preprocess((v) => (v === "" ? undefined : Number(String(v).replace(",", "."))), z.number().min(0).max(1000).optional()),
    isVerified: checkbox,
    source: requiredText(300, 2), sourceUrl: optionalUrl,
    sourceDate: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    position: z.preprocess((v) => (v === "" ? 0 : Number(v)), z.number().int().min(0).max(100)),
  }).superRefine((v, ctx) => {
    if (v.method === "fixed" && (v.amount === undefined || !v.currency)) ctx.addIssue({ code: "custom", path: ["amount"], message: "required" });
    if (v.method === "percent_of_price" && v.percent === undefined) ctx.addIssue({ code: "custom", path: ["percent"], message: "required" });
    if (v.isVerified && !v.sourceDate) ctx.addIssue({ code: "custom", path: ["sourceDate"], message: "required" });
  }), fd);
  if (!r.ok) return r.state;
  const v = r.data;
  return run((s) => s.from("cost_estimate_rules").insert({
    rule_set_id: v.ruleSetId, code: v.code, kind: v.kind, label_ar: v.labelAr, label_fr: v.labelFr, method: v.method,
    amount: v.method === "fixed" ? v.amount ?? null : null, currency: v.method === "fixed" ? v.currency ?? null : null,
    percent: v.method === "percent_of_price" ? v.percent ?? null : null, is_verified: v.isVerified,
    source: v.source, source_url: v.sourceUrl ?? null, source_date: v.sourceDate ?? null, position: v.position,
  }));
}

export async function deleteRuleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ ruleId: uuid }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.from("cost_estimate_rules").delete().eq("id", r.data.ruleId));
}

// ----------------------------------------------------------------------------- pathways & content
export async function updatePathwayAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    code: z.string().regex(/^[a-z_]+$/), isEnabled: checkbox, requiresLegalReview: checkbox,
    nameAr: requiredText(160), nameFr: requiredText(160), descriptionAr: optionalText(2000), descriptionFr: optionalText(2000),
    disabledMessageAr: optionalText(500), disabledMessageFr: optionalText(500), legalReference: optionalText(500), markReviewed: checkbox,
  }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const v = r.data;
  return run((s) => s.from("acquisition_pathways").update({
    is_enabled: v.isEnabled, requires_legal_review: v.requiresLegalReview, name_ar: v.nameAr, name_fr: v.nameFr,
    description_ar: v.descriptionAr ?? "", description_fr: v.descriptionFr ?? "",
    disabled_message_ar: v.disabledMessageAr ?? null, disabled_message_fr: v.disabledMessageFr ?? null,
    legal_reference: v.legalReference ?? null, updated_by: user?.id ?? null,
    ...(v.markReviewed ? { last_reviewed_at: new Date().toISOString() } : {}),
  }).eq("code", v.code));
}

export async function saveFaqAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({
    id: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
    questionAr: requiredText(300), questionFr: requiredText(300), answerAr: requiredText(3000), answerFr: requiredText(3000),
    position: z.preprocess((v) => (v === "" ? 0 : Number(v)), z.number().int().min(0).max(1000)), isPublished: checkbox,
  }), fd);
  if (!r.ok) return r.state;
  const v = r.data;
  const row = { question_ar: v.questionAr, question_fr: v.questionFr, answer_ar: v.answerAr, answer_fr: v.answerFr, position: v.position, is_published: v.isPublished };
  return run((s) => (v.id ? s.from("faqs").update(row).eq("id", v.id) : s.from("faqs").insert(row)));
}

export async function deleteFaqAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ id: uuid }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.from("faqs").delete().eq("id", r.data.id));
}

const SETTING_KEYS = ["contact.email", "contact.phone", "contact.address", "contact.hours", "homepage.hero_title_ar", "homepage.hero_title_fr", "homepage.hero_subtitle_ar", "homepage.hero_subtitle_fr", "listing.validity_days", "listing.stale_after_days", "notifications.email_enabled"] as const;

export async function saveSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  for (const key of SETTING_KEYS) {
    if (!fd.has(key)) continue;
    const raw = String(fd.get(key) ?? "").trim().slice(0, 500);
    // Empty string means "not set" (the column is NOT NULL); readers skip empty values.
    let value: string | number | boolean = raw;
    if (key === "listing.validity_days" || key === "listing.stale_after_days") {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 365) return { ok: false, error: "invalid_input", fieldErrors: { [key]: ["invalid_number"] } };
      value = n;
    }
    if (key === "notifications.email_enabled") value = raw === "true";
    const { error } = await supabase.from("site_settings").update({ value, updated_by: user?.id ?? null }).eq("key", key);
    if (error) return fromDbError(error);
  }
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

export async function publishLegalDocumentAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ slug: z.enum(["terms", "privacy", "disclosure"]), locale: z.enum(["ar", "fr"]), title: requiredText(200), body: requiredText(50000, 20) }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: latest } = await supabase.from("legal_documents").select("version").eq("slug", r.data.slug).eq("locale", r.data.locale).order("version", { ascending: false }).limit(1);
  const { error } = await supabase.from("legal_documents").insert({
    slug: r.data.slug, locale: r.data.locale, version: (latest?.[0]?.version ?? 0) + 1, title: r.data.title, body: r.data.body,
    is_published: true, published_at: new Date().toISOString(), updated_by: user?.id ?? null,
  });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/legal/[slug]", "page");
  return { ok: true };
}

export async function addMakeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ name: requiredText(60) }), fd);
  if (!r.ok) return r.state;
  const slug = r.data.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return { ok: false, error: "invalid_input" };
  return run((s) => s.from("vehicle_makes").insert({ name: r.data.name, slug }));
}

export async function saveServiceCategoryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ code: z.string().regex(/^[a-z_]{2,40}$/, { error: "invalid_input" }), nameAr: requiredText(120), nameFr: requiredText(120), isActive: checkbox }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.from("service_categories").upsert({ code: r.data.code, name_ar: r.data.nameAr, name_fr: r.data.nameFr, is_active: r.data.isActive }));
}

// ----------------------------------------------------------------------------- users & privacy
export async function setRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ userId: uuid, role: z.enum(["admin", "staff"]), grant: z.enum(["1", "0"]) }), fd);
  if (!r.ok) return r.state;
  return run((s) => s.rpc("admin_set_role", { p_user_id: r.data.userId, p_role: r.data.role, p_grant: r.data.grant === "1" }));
}

export async function updateDataRequestAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ id: uuid, status: z.enum(["in_progress", "completed", "rejected"]) }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return run((s) => s.from("data_requests").update({ status: r.data.status, handled_by: user?.id ?? null, handled_at: new Date().toISOString() }).eq("id", r.data.id));
}

export async function markContactHandledAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const r = parse(z.object({ id: uuid }), fd);
  if (!r.ok) return r.state;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return run((s) => s.from("contact_messages").update({ status: "handled", handled_by: user?.id ?? null }).eq("id", r.data.id));
}
