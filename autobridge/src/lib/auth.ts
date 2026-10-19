import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, BusinessStatus } from "@/lib/domain/enums";

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string | null;
  locale: "ar" | "fr";
  roles: AppRole[];
  isStaff: boolean;
  isAdmin: boolean;
  supplier: { id: string; status: BusinessStatus; businessName: string } | null;
  partner: { id: string; status: BusinessStatus; businessName: string } | null;
  unreadNotifications: number;
};

/**
 * The signed-in user with roles and business profiles, or null. Uses getUser(),
 * which validates the session with Supabase Auth (cookies alone are never trusted).
 * Role data shown here only drives navigation; every privileged operation is
 * re-authorized by Row Level Security and SECURITY DEFINER checks in the database.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, roles, supplier, partner, unread] = await Promise.all([
    supabase.from("profiles").select("full_name, preferred_locale").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("supplier_profiles").select("id, status, business_name").eq("owner_id", user.id).maybeSingle(),
    supabase.from("partner_profiles").select("id, status, business_name").eq("owner_id", user.id).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);

  const roleList = (roles.data ?? []).map((r) => r.role);
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.data?.full_name ?? null,
    locale: profile.data?.preferred_locale ?? "ar",
    roles: roleList,
    isStaff: roleList.includes("staff") || roleList.includes("admin"),
    isAdmin: roleList.includes("admin"),
    supplier: supplier.data
      ? { id: supplier.data.id, status: supplier.data.status, businessName: supplier.data.business_name }
      : null,
    partner: partner.data
      ? { id: partner.data.id, status: partner.data.status, businessName: partner.data.business_name }
      : null,
    unreadNotifications: unread.count ?? 0,
  };
});

export async function requireViewer(locale: Locale, nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect({ href: { pathname: "/auth/sign-in", query: { next: `/${locale}${nextPath}` } }, locale });
  }
  return viewer as Viewer;
}

export async function requireStaff(locale: Locale, nextPath = "/admin"): Promise<Viewer> {
  const viewer = await requireViewer(locale, nextPath);
  if (!viewer.isStaff) notFound();
  return viewer;
}

export async function requireAdmin(locale: Locale, nextPath = "/admin"): Promise<Viewer> {
  const viewer = await requireViewer(locale, nextPath);
  if (!viewer.isAdmin) notFound();
  return viewer;
}
