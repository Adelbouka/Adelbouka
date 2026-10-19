import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REQUEST_TRANSITIONS, canTransition, isTerminal, nextStatuses } from "./request-status";

describe("request status transitions", () => {
  it("matches the database transition table exactly", () => {
    const sql = readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20261019000004_requests_quotations.sql"), "utf8");
    const block = sql.slice(sql.indexOf("create or replace function private.request_transition_allowed"));
    const values = block.slice(0, block.indexOf(") as t (actor, from_status, to_status)"));
    const fromSql = [...values.matchAll(/\('(\w+)', '(\w+)', '(\w+)'\)/g)].map((m) => `${m[1]}:${m[2]}:${m[3]}`).sort();
    const fromTs = REQUEST_TRANSITIONS.map(([a, f, t]) => `${a}:${f}:${t}`).sort();
    expect(fromSql.length).toBeGreaterThan(20);
    expect(fromTs).toEqual(fromSql);
  });

  it("lets customers submit drafts and cancel open requests only", () => {
    expect(canTransition("draft", "submitted", "customer")).toBe(true);
    expect(canTransition("submitted", "cancelled", "customer")).toBe(true);
    expect(canTransition("submitted", "under_review", "customer")).toBe(false);
    expect(canTransition("accepted", "cancelled", "customer")).toBe(false);
    expect(canTransition("in_progress", "completed", "customer")).toBe(false);
  });

  it("prevents staff from skipping steps", () => {
    expect(canTransition("submitted", "completed", "staff")).toBe(false);
    expect(canTransition("submitted", "accepted", "staff")).toBe(false);
    expect(canTransition("in_progress", "completed", "staff")).toBe(true);
  });

  it("only accepts via the quotation workflow", () => {
    expect(nextStatuses("awaiting_customer_decision", "staff")).not.toContain("accepted");
    expect(canTransition("awaiting_customer_decision", "accepted", "system")).toBe(true);
  });

  it("has no outgoing transitions from terminal states", () => {
    for (const s of ["completed", "cancelled", "rejected"] as const) {
      expect(isTerminal(s)).toBe(true);
      expect(nextStatuses(s, "staff")).toEqual([]);
      expect(nextStatuses(s, "customer")).toEqual([]);
    }
  });
});
