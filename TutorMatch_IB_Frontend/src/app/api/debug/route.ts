import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKEN = "tm-diag-2026";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  let projectRef: string | null = null;
  try {
    projectRef = supabaseUrl ? new URL(supabaseUrl).hostname : null;
  } catch {
    projectRef = null;
  }

  const hasPublishable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  const out: Record<string, unknown> = {
    supabaseUrl,
    projectRef,
    hasPublishableKey: hasPublishable,
    hasServiceRoleKey: Boolean(serviceKey),
    adminEmails: process.env.ADMIN_EMAILS ?? null,
  };

  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?per_page=200`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: "no-store",
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { users?: { email?: string }[] };
        const users = data.users ?? [];
        out.userCount = users.length;
        out.hasAdminUser = users.some(
          (u) => u.email === "admin@tutormatch.test",
        );
      } else {
        out.adminApiStatus = res.status;
        out.adminApiError = (await res.text()).slice(0, 200);
      }
    } catch (error) {
      out.adminApiError = String(error).slice(0, 200);
    }
  }

  return NextResponse.json(out);
}
