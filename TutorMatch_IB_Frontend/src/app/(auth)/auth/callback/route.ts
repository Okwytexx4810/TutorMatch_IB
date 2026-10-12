import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { promoteConfiguredAdmin } from "@/lib/auth/admin";
import { homeForRole } from "@/lib/auth/roles";
import { readTrustedRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";

/** Reason keys the login page knows how to phrase. */
type CallbackFailure = "expired" | "missing_code" | "unconfigured";

/**
 * Supabase Auth callback.
 *
 * Handles both shapes Supabase can send back:
 *
 * - `?code=...`      PKCE flow, which is the default for `@supabase/ssr`.
 * - `?token_hash=...&type=...`  the `{{ .TokenHash }}` email template style.
 *
 * Either way the code is exchanged for a real session here, on the server, so
 * the resulting cookies are written with the redirect response before the user
 * reaches the app.
 */

/**
 * Same-site paths only.
 *
 * Blocks `?next=https://evil.example`. Backslashes are rejected as well, because
 * the WHATWG URL standard treats `\` as a path separator for http(s), so
 * `/\evil.example` would resolve as a protocol-relative URL and send the freshly
 * authenticated user off-site.
 */
function safeNext(candidate: string | null): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith("/")) return null;
  if (candidate.startsWith("//")) return null;
  if (candidate.includes("\\")) return null;
  return candidate;
}

/**
 * Bounce back to sign in.
 *
 * Only a short reason *key* is placed in the URL; the human-readable sentence
 * lives in the login page. That keeps auth copy in one place and stops internal
 * Supabase wording from ending up in a shareable link.
 */
function failure(reason: CallbackFailure): NextResponse {
  const url = new URL(ROUTES.login);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tokenType = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return failure("unconfigured");
  }

  if (!code && !tokenHash) {
    return failure("missing_code");
  }

  const pending: { name: string; value: string; options: Parameters<typeof serializeCookieHeader>[2] }[] = [];

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll: () => parseCookieHeader(request.headers.get("Cookie") ?? ""),
        setAll: (cookiesToSet) => {
          pending.push(...cookiesToSet);
        },
      },
    },
  );

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        type: tokenType === "recovery" ? "recovery" : "email",
        token_hash: tokenHash ?? "",
      });

  if (error || !data.user) {
    return failure("expired");
  }

  // Bootstrap an allow-listed administrator before choosing the destination, so
  // the fresh admin is routed to /admin rather than a student dashboard.
  await promoteConfiguredAdmin(data.user.id, data.user.email);

  // Default destination follows the database role. `next` still wins when it is
  // present, and `isSafeNextPath` has already rejected anything off-site.
  //
  // The session established above lives in this client's memory only, because the
  // cookies are attached to the outgoing response, so the live client is handed
  // to the reader rather than reading the (still anonymous) request cookies.
  const destination =
    next ??
    homeForRole(await readTrustedRole(supabase, data.user.id));
  const response = NextResponse.redirect(new URL(destination, url.origin));

  for (const { name, value, options } of pending) {
    response.headers.append(
      "Set-Cookie",
      serializeCookieHeader(name, value, options),
    );
  }

  // A response that carries a fresh session must never be cached.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");

  return response;
}
