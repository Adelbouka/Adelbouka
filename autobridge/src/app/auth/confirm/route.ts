import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite", "magiclink"];

/**
 * Handles links from Supabase Auth e-mails (confirmation, password recovery).
 * The token hash is verified server-side and the session cookie is set before redirecting.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const locale = (searchParams.get("next") ?? "").startsWith("/fr") ? "fr" : "ar";
  const fallback = type === "recovery" ? `/${locale}/auth/reset-password` : `/${locale}/account`;
  const next = safeNextPath(searchParams.get("next"), fallback);

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=link_invalid`, request.url));
}
