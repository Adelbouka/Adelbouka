import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  anon, approvedSupplier, cleanup, grantRole, makeId, makeUser, publishedVehicle, RUN, service, vehicleRow, type TestUser,
} from "./helpers";

let admin: TestUser, staff: TestUser, customerA: TestUser, customerB: TestUser;
let supplierA: TestUser, supplierB: TestUser, applicant: TestUser;
let supplierAId: string;

beforeAll(async () => {
  [admin, staff, customerA, customerB, supplierA, supplierB, applicant] = await Promise.all(
    ["admin", "staff", "custa", "custb", "supa", "supb", "applicant"].map(makeUser),
  );
  await grantRole(admin, "admin");
  await grantRole(staff, "staff");
  supplierAId = await approvedSupplier(supplierA, "Supplier A");
  await approvedSupplier(supplierB, "Supplier B");
});

afterAll(cleanup);

describe("listing visibility and ownership", () => {
  it("public users cannot access unpublished listings", async () => {
    const { data: draft, error } = await supplierA.client.from("vehicles").insert(vehicleRow(supplierAId, await makeId(), { vin: "WVWZZZCDZPW123456" })).select("id, slug, status").single();
    expect(error).toBeNull();
    expect(draft!.status).toBe("draft");

    const visitor = anon();
    expect((await visitor.from("vehicles").select("id").eq("id", draft!.id)).data).toEqual([]);
    expect((await visitor.from("marketplace_vehicles").select("id").eq("id", draft!.id)).data).toEqual([]);
    expect((await customerA.client.from("vehicles").select("id").eq("id", draft!.id)).data).toEqual([]);
    expect((await supplierB.client.from("vehicles").select("id").eq("id", draft!.id)).data).toEqual([]);
    // Images of an unpublished listing are not listed either.
    expect((await visitor.from("vehicle_images").select("id").eq("vehicle_id", draft!.id)).data).toEqual([]);
    // The owner and staff can see it.
    expect((await supplierA.client.from("vehicles").select("id").eq("id", draft!.id)).data).toHaveLength(1);
    expect((await staff.client.from("vehicles").select("id").eq("id", draft!.id)).data).toHaveLength(1);
  });

  it("suppliers cannot publish their own listings", async () => {
    const { data } = await supplierA.client.from("vehicles").insert({ ...vehicleRow(supplierAId, await makeId()), status: "published" }).select("id, status").single();
    expect(data!.status).toBe("draft");
    const { error } = await supplierA.client.from("vehicles").update({ status: "published" }).eq("id", data!.id);
    expect(error?.message).toContain("invalid_transition");
    const { error: e2 } = await supplierA.client.from("vehicles").update({ promoted_until: "2099-01-01T00:00:00Z" }).eq("id", data!.id);
    expect(e2?.message).toContain("protected_fields");
  });

  it("listing approval publishes the listing without exposing the VIN", async () => {
    const v = await publishedVehicle(supplierA, supplierAId, staff, { vin: "WVWZZZCDZPW654321" });
    const { data } = await anon().from("marketplace_vehicles").select("*").eq("id", v.id).single();
    expect(data).toBeTruthy();
    expect(data!.vin_masked).toBe("••••••••••••54321");
    expect(Object.keys(data!)).not.toContain("vin");
    // Supplier contact details are not part of the public projection.
    expect(Object.keys(data!)).not.toContain("contact_phone");
  });

  it("suppliers cannot edit another supplier's vehicles", async () => {
    const v = await publishedVehicle(supplierA, supplierAId, staff);
    const { data, error } = await supplierB.client.from("vehicles").update({ price_amount: 1 }).eq("id", v.id).select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: after } = await service.from("vehicles").select("price_amount").eq("id", v.id).single();
    expect(Number(after!.price_amount)).toBe(20000);
    const { error: insertErr } = await supplierB.client.from("vehicles").insert(vehicleRow(supplierAId, await makeId()));
    expect(insertErr).not.toBeNull();
    const { error: delErr, data: deleted } = await supplierB.client.from("vehicles").delete().eq("id", v.id).select("id");
    expect(delErr).toBeNull();
    expect(deleted).toEqual([]);
  });

  it("editing the facts of a published listing sends it back to review, price edits do not", async () => {
    const v = await publishedVehicle(supplierA, supplierAId, staff);
    await supplierA.client.from("vehicles").update({ price_amount: 19500 }).eq("id", v.id);
    expect((await service.from("vehicles").select("status").eq("id", v.id).single()).data!.status).toBe("published");
    await supplierA.client.from("vehicles").update({ mileage_km: 1000 }).eq("id", v.id);
    expect((await service.from("vehicles").select("status").eq("id", v.id).single()).data!.status).toBe("pending_review");
    expect((await anon().from("marketplace_vehicles").select("id").eq("id", v.id)).data).toEqual([]);
  });

  it("unapproved suppliers cannot create listings", async () => {
    const pending = await makeUser("pendingsup");
    const { data: profile } = await pending.client.from("supplier_profiles").insert({
      owner_id: pending.id, business_name: `Pending ${RUN}`, country_code: "FR", city: "Paris",
      contact_name: "Pending Contact", contact_email: pending.email, contact_phone: "+33 1 00 00 00",
    }).select("id").single();
    const { error } = await pending.client.from("vehicles").insert(vehicleRow(profile!.id, await makeId()));
    expect(error).not.toBeNull();
  });

  it("only staff can moderate listings", async () => {
    const { data } = await supplierA.client.from("vehicles").insert({ ...vehicleRow(supplierAId, await makeId()), status: "pending_review" }).select("id").single();
    for (const user of [supplierA, customerA]) {
      const { error } = await user.client.rpc("admin_review_vehicle", { p_vehicle_id: data!.id, p_decision: "approve" });
      expect(error?.message).toContain("forbidden");
    }
    const { error } = await anon().rpc("admin_review_vehicle", { p_vehicle_id: data!.id, p_decision: "approve" });
    expect(error).not.toBeNull();
  });
});

describe("supplier applications", () => {
  it("new applications are never approved automatically", async () => {
    const { data, error } = await applicant.client.from("supplier_profiles").insert({
      owner_id: applicant.id, business_name: `Applicant ${RUN}`, country_code: "BE", city: "Liège",
      contact_name: "Applicant Contact", contact_email: applicant.email, contact_phone: "+32 4 000 00 00", status: "approved", is_demo: true,
    }).select("id, status, is_demo").single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "pending", is_demo: false });
    expect((await anon().from("public_suppliers").select("id").eq("id", data!.id)).data).toEqual([]);
  });

  it("unauthorized users cannot approve supplier applications", async () => {
    const { data: app } = await service.from("supplier_profiles").select("id").eq("owner_id", applicant.id).single();
    for (const user of [applicant, customerA, supplierA, staff]) {
      const { error } = await user.client.rpc("admin_set_business_status", { p_kind: "supplier", p_id: app!.id, p_status: "approved" });
      expect(error?.message, user.email).toContain("forbidden");
    }
    const { error: direct } = await applicant.client.from("supplier_profiles").update({ status: "approved" }).eq("id", app!.id);
    expect(direct?.message).toContain("protected_fields");
    expect((await service.from("supplier_profiles").select("status").eq("id", app!.id).single()).data!.status).toBe("pending");
  });

  it("administrators approve with an audit trail and a notification", async () => {
    const { data: app } = await service.from("supplier_profiles").select("id").eq("owner_id", applicant.id).single();
    const { error: noReason } = await admin.client.rpc("admin_set_business_status", { p_kind: "supplier", p_id: app!.id, p_status: "rejected" });
    expect(noReason?.message).toContain("reason_required");
    const { error } = await admin.client.rpc("admin_set_business_status", { p_kind: "supplier", p_id: app!.id, p_status: "approved" });
    expect(error).toBeNull();
    const { data: audit } = await service.from("audit_logs").select("action, actor_id").eq("entity_id", app!.id).eq("action", "business.status_changed");
    expect(audit?.[0]?.actor_id).toBe(admin.id);
    const { data: notes } = await applicant.client.from("notifications").select("type").eq("type", "supplier.status.approved");
    expect(notes?.length).toBe(1);
  });

  it("verification documents and internal check notes are never public", async () => {
    await staff.client.from("supplier_verification_records").insert({
      supplier_id: supplierAId, check_type: "business_registration", result: "passed", method: "Registry lookup", notes: "internal remark", verified_by: staff.id,
    });
    await staff.client.from("supplier_verification_records").insert({
      supplier_id: supplierAId, check_type: "site_visit", result: "failed", method: "Visit", verified_by: staff.id,
    });
    const { data: pub } = await anon().from("public_business_verifications").select("*").eq("supplier_id", supplierAId);
    expect(pub?.map((p) => p.check_type)).toEqual(["business_registration"]);
    expect(Object.keys(pub![0])).not.toContain("notes");
    expect((await customerA.client.from("supplier_verification_records").select("id").eq("supplier_id", supplierAId)).data).toEqual([]);
    expect((await supplierA.client.from("supplier_verification_records").select("id")).data).toEqual([]);
    const { error } = await customerA.client.from("supplier_verification_records").insert({ supplier_id: supplierAId, check_type: "other", result: "passed", method: "fake", verified_by: customerA.id });
    expect(error).not.toBeNull();
  });
});

describe("purchase requests and quotations", () => {
  let requestId: string;
  let vehicleId: string;

  beforeAll(async () => {
    const v = await publishedVehicle(supplierA, supplierAId, staff);
    vehicleId = v.id;
    const { data, error } = await customerA.client.from("purchase_requests").insert({
      request_type: "listed_vehicle", vehicle_id: vehicleId, pathway_code: "individual_used_vehicle",
      contact_name: "Customer A", contact_phone: "0550 00 00 01", wilaya: "Alger", status: "under_review",
    }).select("id, status, supplier_id, legal_review_status, vehicle_snapshot").single();
    if (error) throw error;
    requestId = data!.id;
    expect(data!.status).toBe("submitted");
    expect(data!.supplier_id).toBe(supplierAId);
    expect(data!.legal_review_status).toBe("pending");
    expect((data!.vehicle_snapshot as { model: string }).model).toBe(`Model${RUN}`);
  });

  it("customers cannot access another customer's private requests", async () => {
    expect((await customerB.client.from("purchase_requests").select("id").eq("id", requestId)).data).toEqual([]);
    expect((await customerB.client.from("request_status_history").select("id").eq("request_id", requestId)).data).toEqual([]);
    expect((await anon().from("purchase_requests").select("id").eq("id", requestId)).data).toEqual([]);
    const { data: upd } = await customerB.client.from("purchase_requests").update({ message: "hijack" }).eq("id", requestId).select("id");
    expect(upd).toEqual([]);
    const { error } = await customerB.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "cancelled" });
    expect(error?.message).toContain("forbidden");
  });

  it("suppliers never see customer contact details", async () => {
    expect((await supplierA.client.from("purchase_requests").select("id").eq("id", requestId)).data).toEqual([]);
    // Not forwarded yet: hidden from the supplier view too.
    expect((await supplierA.client.from("supplier_purchase_requests").select("id").eq("id", requestId)).data).toEqual([]);
  });

  it("request status changes are validated on the server", async () => {
    // A submitted request is no longer updatable by its owner at all (RLS), and a draft's
    // status column is guarded by a trigger; either way the status cannot be forged.
    const { data: forged } = await customerA.client.from("purchase_requests").update({ status: "accepted" }).eq("id", requestId).select("id");
    expect(forged).toEqual([]);
    const { data: draft } = await customerA.client.from("purchase_requests").insert({
      request_type: "custom_search", desired_make_id: await makeId(), pathway_code: "undecided",
      contact_name: "Customer A", contact_phone: "0550 00 00 01", wilaya: "Alger", status: "draft",
    }).select("id").single();
    const { error: e1 } = await customerA.client.from("purchase_requests").update({ status: "accepted" }).eq("id", draft!.id);
    expect(e1?.message).toContain("protected_fields");
    expect((await service.from("purchase_requests").select("status").eq("id", requestId).single()).data!.status).toBe("submitted");
    const { error: e2 } = await customerA.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "under_review" });
    expect(e2?.message).toContain("invalid_transition");
    const { error: e3 } = await staff.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "completed" });
    expect(e3?.message).toContain("invalid_transition");
    const { error: e4 } = await staff.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "rejected" });
    expect(e4?.message).toContain("reason_required");
    expect((await staff.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "under_review" })).error).toBeNull();
    expect((await staff.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "supplier_contacted", p_note: "sent to supplier" })).error).toBeNull();
    const { data: history } = await customerA.client.from("request_status_history").select("to_status").eq("request_id", requestId).order("created_at");
    expect(history?.map((h) => h.to_status)).toEqual(["submitted", "under_review", "supplier_contacted"]);
  });

  it("forwarded requests reach the supplier without contact fields", async () => {
    const { data } = await supplierA.client.from("supplier_purchase_requests").select("*").eq("id", requestId).single();
    expect(data).toBeTruthy();
    for (const k of ["contact_name", "contact_phone", "contact_email", "customer_id"]) expect(Object.keys(data!)).not.toContain(k);
    expect((await supplierB.client.from("supplier_purchase_requests").select("id").eq("id", requestId)).data).toEqual([]);
  });

  it("fee lines cannot misrepresent a platform fee as customs", async () => {
    const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { error } = await supplierA.client.rpc("submit_quotation", {
      p_request_id: requestId, p_currency: "EUR", p_valid_until: validUntil, p_terms: "",
      p_items: [{ kind: "taxes_and_customs", description: "Commission", amount: 300, payee: "platform", is_estimate: true }],
    });
    expect(error).not.toBeNull();
    const { error: other } = await supplierB.client.rpc("submit_quotation", {
      p_request_id: requestId, p_currency: "EUR", p_valid_until: validUntil, p_terms: "",
      p_items: [{ kind: "vehicle_price", description: "Prix", amount: 1, payee: "supplier" }],
    });
    expect(other?.message).toContain("forbidden");
  });

  it("runs the full quotation workflow with legal review before progress", async () => {
    const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { data: quoteId, error } = await supplierA.client.rpc("submit_quotation", {
      p_request_id: requestId, p_currency: "EUR", p_valid_until: validUntil, p_terms: "Paiement à la livraison",
      p_items: [
        { kind: "vehicle_price", description: "Prix du véhicule", amount: 20000, payee: "supplier" },
        { kind: "international_shipping", description: "Transport", amount: 1100.5, payee: "supplier", is_estimate: true },
        { kind: "taxes_and_customs", description: "Droits (estimation)", amount: 5000, payee: "public_authority", is_estimate: false },
      ],
    });
    expect(error).toBeNull();
    const { data: q } = await service.from("quotations").select("total_amount, status, quotation_items(kind, is_estimate)").eq("id", quoteId as string).single();
    expect(Number(q!.total_amount)).toBe(26100.5);
    // Customs lines are always stored as estimates.
    expect(q!.quotation_items.find((i) => i.kind === "taxes_and_customs")?.is_estimate).toBe(true);

    // Not visible to the customer before staff review.
    expect((await customerA.client.from("quotations").select("id").eq("id", quoteId as string)).data).toEqual([]);
    expect((await supplierA.client.rpc("send_quotation", { p_quotation_id: quoteId as string })).error?.message).toContain("forbidden");
    expect((await staff.client.rpc("send_quotation", { p_quotation_id: quoteId as string, p_message: "Vérifié" })).error).toBeNull();
    const { data: visible } = await customerA.client.from("quotations").select("id, quotation_items(id)").eq("id", quoteId as string).single();
    expect(visible?.quotation_items).toHaveLength(3);
    expect((await customerB.client.from("quotations").select("id").eq("id", quoteId as string)).data).toEqual([]);

    expect((await customerB.client.rpc("respond_to_quotation", { p_quotation_id: quoteId as string, p_accept: true })).error?.message).toContain("forbidden");
    expect((await customerA.client.rpc("respond_to_quotation", { p_quotation_id: quoteId as string, p_accept: true })).error).toBeNull();
    expect((await service.from("purchase_requests").select("status").eq("id", requestId).single()).data!.status).toBe("accepted");

    const { error: blocked } = await staff.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "in_progress" });
    expect(blocked?.message).toContain("legal_review_required");
    expect((await customerA.client.rpc("record_legal_review", { p_request_id: requestId, p_decision: "approved", p_note: "x" })).error?.message).toContain("forbidden");
    expect((await staff.client.rpc("record_legal_review", { p_request_id: requestId, p_decision: "approved", p_note: "Pathway confirmed" })).error).toBeNull();
    expect((await staff.client.rpc("transition_purchase_request", { p_request_id: requestId, p_to: "in_progress" })).error).toBeNull();

    // Milestones are recorded events, by staff only.
    const today = new Date().toISOString().slice(0, 10);
    expect((await customerA.client.from("request_milestones").insert({ request_id: requestId, kind: "shipped", occurred_on: today, recorded_by: customerA.id })).error).not.toBeNull();
    expect((await staff.client.from("request_milestones").insert({ request_id: requestId, kind: "vehicle_purchased", occurred_on: today, recorded_by: staff.id })).error).toBeNull();
    expect((await customerA.client.from("request_milestones").select("kind").eq("request_id", requestId)).data).toEqual([{ kind: "vehicle_purchased" }]);

    // The customer was notified along the way and cannot forge notifications.
    const { data: notes } = await customerA.client.from("notifications").select("type");
    expect(notes?.map((n) => n.type)).toEqual(expect.arrayContaining(["request.status_changed", "quotation.received", "request.legal_review", "request.milestone"]));
    expect((await customerA.client.from("notifications").insert({ user_id: customerA.id, type: "fake" })).error).not.toBeNull();
  });

  it("disabled pathways cannot receive new requests", async () => {
    await service.from("acquisition_pathways").update({ is_enabled: false }).eq("code", "change_of_residence");
    const { error } = await customerB.client.from("purchase_requests").insert({
      request_type: "custom_search", desired_make_id: await makeId(), pathway_code: "change_of_residence",
      contact_name: "B", contact_phone: "0550 00 00 02", wilaya: "Oran",
    });
    await service.from("acquisition_pathways").update({ is_enabled: true }).eq("code", "change_of_residence");
    expect(error?.message).toContain("pathway_disabled");
  });
});

describe("file storage access", () => {
  const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });

  it("verification documents are private to their owner and staff", async () => {
    const path = `${supplierA.id}/${crypto.randomUUID()}.pdf`;
    expect((await supplierA.client.storage.from("verification-docs").upload(path, pdf, { contentType: "application/pdf" })).error).toBeNull();
    expect((await supplierA.client.storage.from("verification-docs").download(path)).error).toBeNull();
    expect((await supplierB.client.storage.from("verification-docs").download(path)).error).not.toBeNull();
    expect((await customerA.client.storage.from("verification-docs").download(path)).error).not.toBeNull();
    expect((await anon().storage.from("verification-docs").download(path)).error).not.toBeNull();
    const { data: signed } = await staff.client.storage.from("verification-docs").createSignedUrl(path, 30);
    expect(signed?.signedUrl).toBeTruthy();
    const { data: signedB } = await supplierB.client.storage.from("verification-docs").createSignedUrl(path, 30);
    expect(signedB?.signedUrl ?? null).toBeNull();
    // Registering someone else's file is refused.
    const { error } = await supplierB.client.from("verification_documents").insert({
      supplier_id: supplierAId, uploaded_by: supplierB.id, doc_type: "other", storage_path: path, file_name: "x.pdf", mime_type: "application/pdf", size_bytes: 10,
    });
    expect(error).not.toBeNull();
  });

  it("uploads into another user's folder are refused", async () => {
    const { error } = await supplierB.client.storage.from("verification-docs").upload(`${supplierA.id}/${crypto.randomUUID()}.pdf`, pdf, { contentType: "application/pdf" });
    expect(error).not.toBeNull();
    const { error: noProfile } = await customerA.client.storage.from("verification-docs").upload(`${customerA.id}/${crypto.randomUUID()}.pdf`, pdf, { contentType: "application/pdf" });
    expect(noProfile).not.toBeNull();
  });

  it("vehicle photos can only be added to the uploader's own listings", async () => {
    const v = await publishedVehicle(supplierA, supplierAId, staff);
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    expect((await supplierA.client.storage.from("vehicle-images").upload(`${supplierA.id}/${v.id}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" })).error).toBeNull();
    expect((await supplierB.client.storage.from("vehicle-images").upload(`${supplierB.id}/${v.id}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" })).error).not.toBeNull();
    expect((await supplierB.client.storage.from("vehicle-images").upload(`${supplierA.id}/${v.id}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" })).error).not.toBeNull();
    const { error: wrongType } = await supplierA.client.storage.from("vehicle-images").upload(`${supplierA.id}/${v.id}/${crypto.randomUUID()}.pdf`, pdf, { contentType: "application/pdf" });
    expect(wrongType).not.toBeNull();
    const { error: external } = await supplierA.client.from("vehicle_images").insert({ vehicle_id: v.id, external_url: "https://example.com/x.jpg" });
    expect(external?.message).toContain("external_images_not_allowed");
  });
});

describe("global configuration", () => {
  it("only administrators change rates, roles and pathways", async () => {
    const rate = { base_currency: "EUR", quote_currency: "DZD", rate: 1, source: "test", effective_date: "2020-01-01" };
    expect((await staff.client.from("exchange_rates").insert({ ...rate, recorded_by: staff.id })).error).not.toBeNull();
    expect((await customerA.client.from("exchange_rates").insert({ ...rate, recorded_by: customerA.id })).error).not.toBeNull();
    const { data: upd } = await staff.client.from("acquisition_pathways").update({ is_enabled: false }).eq("code", "new_vehicle").select("code");
    expect(upd).toEqual([]);
    expect((await staff.client.rpc("admin_set_role", { p_user_id: customerA.id, p_role: "admin", p_grant: true })).error?.message).toContain("forbidden");
    expect((await customerA.client.from("user_roles").insert({ user_id: customerA.id, role: "admin", granted_by: customerA.id })).error).not.toBeNull();
  });

  it("active cost rule versions are immutable", async () => {
    const { data: active } = await service.from("cost_rule_sets").select("id").eq("status", "active").single();
    const { error } = await admin.client.from("cost_estimate_rules").insert({
      rule_set_id: active!.id, code: `x_${RUN}`, kind: "other", label_ar: "x", label_fr: "x", method: "quote_required", source: "test",
    });
    expect(error?.message).toContain("rule_set_locked");
  });
});
