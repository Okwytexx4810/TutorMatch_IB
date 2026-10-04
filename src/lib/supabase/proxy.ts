import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session handling for `src/proxy.ts`.
 *
 * Uses `getUser()` (network validation) to stay consistent with the server
 * guards (`lib/auth/session.ts`). This avoids redirect loops when local
 * JWT validation (`getClaims()`) behaves differently in certain environments.
 */

type PendingCookie = { name: string; value: string; options: CookieOptions };

/** Areas that require a signed-in user. Enforced again inside each layout. */
const PROTECTED_PREFIXES = ["/dashboard", "/tutor", "/admin"] as const;

/** Routes that must never be cached by a CDN, because they set auth cookies. */
const AUTH_PATHS = new Set(["/login", "/register", "/auth"]);

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthFlowPath(pathname: string): boolean {
  return (
    AUTH_PATHS.has(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

export async function updateSession(request: NextRequest): Promise<Response> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Unconfigured deployments must still render the marketing site. Auth is
  // simply unavailable, and the auth pages say so rather than failing silently.
  if (!supabaseUrl || !supabasePublishableKey) return response;

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient<never>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet, headers) {
          pendingCookies.push(...cookiesToSet);
          Object.assign(pendingHeaders, headers);
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (error || !user) {
    if (isProtectedPath(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      // Carries the original destination so login can return the user to it.
      redirectUrl.searchParams.set("next", `${pathname}${search}`);
      response = NextResponse.redirect(redirectUrl);
    }
  }

  for (const { name, value, options } of pendingCookies) {
    response.headers.append(
      "Set-Cookie",
      serializeCookieHeader(name, value, options),
    );
  }

  for (const [key, value] of Object.entries(pendingHeaders)) {
    response.headers.set(key, value);
  }

  // Belt and braces: responses that carry auth state must never be cached.
  if (isProtectedPath(pathname) || isAuthFlowPath(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  return response;
}
