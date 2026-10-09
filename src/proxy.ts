import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session handling for `src/proxy.ts`.
 *
 * Page and layout renders cannot write cookies, so this is where an expired
 * access token is refreshed for those requests. The refreshed cookies have to
 * be written in two places, inside `setAll`, or the browser and the server
 * drift apart and the next request is signed out:
 *
 * 1. Onto the request, via `request.cookies.set`, so the Server Components
 *    that run after this Proxy read the new token instead of refreshing again.
 * 2. Onto the response, via `response.cookies.set`, so the browser stores it.
 *
 * The `response` object created inside `setAll` is the one that must be
 * returned. Rebuilding it afterwards and appending `Set-Cookie` by hand drops
 * the new token; the refresh token was already consumed, and the following
 * request is signed out.
 *
 * Server Actions are the exception. They can write cookies themselves, and
 * they read the cookie jar from the incoming request rather than from the
 * request this Proxy mutates. Refreshing here as well rotates the single-use
 * refresh token, the action then presents the pre-rotation token, Supabase
 * rejects it and clears the session, and `requireRole` sends the tutor to
 * `/login`. That is the "Create my profile" bounce. Actions refresh once, in
 * `lib/supabase/server.ts`.
 */

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

function withPrivateCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

/**
 * Copy every `Set-Cookie` from the session response onto a redirect.
 *
 * A redirect built with `NextResponse.redirect` does not inherit cookies from
 * the response `setAll` just built. Dropping them here would leave the browser
 * holding a refresh token this request already consumed.
 */
function redirectWithSession(
  sessionResponse: NextResponse,
  location: URL,
): NextResponse {
  const redirectResponse = NextResponse.redirect(location);

  for (const cookie of sessionResponse.headers.getSetCookie()) {
    redirectResponse.headers.append("Set-Cookie", cookie);
  }

  return withPrivateCache(redirectResponse);
}

export async function proxy(request: NextRequest): Promise<Response> {
  if (request.headers.has("next-action")) {
    // Do not pass `{ request }`. Doing so makes the Proxy override the
    // incoming `Cookie` header with its own cookie jar, and on a Server
    // Action POST that jar is not a faithful copy of the browser's chunked
    // session cookies. The action then sees no session and redirects to
    // `/login`. Leaving the request untouched preserves the cookies the
    // browser actually sent.
    return withPrivateCache(NextResponse.next());
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Unconfigured deployments must still render the marketing site. Auth is
  // simply unavailable, and the auth pages say so rather than failing silently.
  if (!supabaseUrl || !supabasePublishableKey) return supabaseResponse;

  const supabase = createServerClient<never>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }

          for (const [key, value] of Object.entries(headers)) {
            supabaseResponse.headers.set(key, value);
          }
        },
      },
    },
  );

  // Do not put logic between creating the client and this call. `getUser()`
  // is what refreshes an expired token, and it has to run before anything
  // else reads the session.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // A transient reuse of a refresh token means another request in the same
  // rotation window already consumed it; the session is not actually gone, so
  // do not bounce the user to login on it.
  const isRefreshTokenAlreadyUsed =
    Boolean(error) &&
    (error as { code?: unknown }).code === "refresh_token_already_used";

  if (
    !isRefreshTokenAlreadyUsed &&
    isProtectedPath(pathname) &&
    (error || !user)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    // Carries the original destination so login can return the user to it.
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return redirectWithSession(supabaseResponse, redirectUrl);
  }

  if (isProtectedPath(pathname) || isAuthFlowPath(pathname)) {
    return withPrivateCache(supabaseResponse);
  }

  return supabaseResponse;
}