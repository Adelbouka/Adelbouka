import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider } from "@/lib/email/provider";
import { SITE_URL } from "@/lib/env";
import { notificationText } from "@/components/notifications/notification-text";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sends queued in-app notifications by e-mail to users who opted in.
 * Call from a scheduler (e.g. every 5 minutes) with "Authorization: Bearer $CRON_SECRET".
 * Every processed notification is stamped, so nothing is e-mailed twice.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const provider = getEmailProvider();
  const db = createAdminClient();

  const { data: setting } = await db.from("site_settings").select("value").eq("key", "notifications.email_enabled").maybeSingle();
  const enabled = setting?.value !== false && setting?.value !== "false";

  const { data: queue, error } = await db
    .from("notifications")
    .select("id, type, params, link, profiles(email, preferred_locale, notify_email)")
    .is("emailed_at", null)
    .order("created_at")
    .limit(100);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  let sent = 0, skipped = 0, failed = 0;
  for (const n of queue ?? []) {
    const profile = n.profiles;
    let outcome: "sent" | "skipped" | "failed" = "skipped";
    if (enabled && profile?.email && profile.notify_email) {
      const locale = profile.preferred_locale ?? "ar";
      const text = await notificationText(n.type, n.params, locale);
      const link = n.link ? `${SITE_URL}/${locale}${n.link}` : `${SITE_URL}/${locale}/account/notifications`;
      try {
        outcome = await provider.send({
          to: profile.email,
          subject: `AutoBridge DZ — ${text.slice(0, 120)}`,
          text: `${text}\n\n${link}\n\n—\nAutoBridge DZ`,
        });
      } catch {
        outcome = "failed";
      }
    }
    if (outcome === "failed") {
      failed++;
      continue; // retried on the next run
    }
    if (outcome === "sent") sent++;
    else skipped++;
    await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
  }
  return NextResponse.json({ provider: provider.name, processed: queue?.length ?? 0, sent, skipped, failed });
}
