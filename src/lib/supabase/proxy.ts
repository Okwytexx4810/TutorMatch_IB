import { createServerClient, serializeCookieHeader } from "@supabase/ssr";
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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Write the refreshed session back onto the *request* as well as the
          // response. The Proxy and the Server Components/Actions that follow
          // use independent Supabase clients with independent cookie stores, so
          // unless the new cookies are forwarded on the request the app client
          // reads the stale token and attempts a second refresh, which fails
          // with `refresh_token_already_used` and signs the user out mid-flight.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
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

  // Server Actions send a `next-action` header (Next.js strips only the Flight
  // cache headers from the Proxy, not this one). Redirecting an action request
  // replaces the RSC response with an HTML redirect, which the client surfaces
  // as "An unexpected response was received from the server". Let the action run
  // and re-check the session itself with `requireRole`, the real boundary.
  const isServerAction = request.headers.has("next-action");

  // A transient reuse of a refresh token means another request in the same
  // rotation window already consumed it; the session is not actually gone, so
  // do not bounce the user to login on it.
  const isRefreshTokenAlreadyUsed =
    Boolean(error) &&
    (error as { code?: unknown }).code === "refresh_token_already_used";

  if (
    !isServerAction &&
    !isRefreshTokenAlreadyUsed &&
    isProtectedPath(pathname) &&
    (error || !user)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    // Carries the original destination so login can return the user to it.
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(redirectUrl);
  } else if (pendingCookies.length > 0) {
    // Rebuild the response so `NextResponse.next` forwards the refreshed
    // cookies to this same request's Server Components and Server Actions.
    response = NextResponse.next({ request });
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
