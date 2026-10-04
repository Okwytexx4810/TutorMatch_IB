import type { NextProxy } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy. In this version `middleware.ts` is deprecated and renamed
 * to `proxy.ts`; see `node_modules/next/dist/docs/.../proxy.md`.
 *
 * Its only job is to refresh the Supabase session before any render and to send
 * unauthenticated visitors away from the protected areas. It is a fast path,
 * not the security boundary: every Server Component guard and Server Action
 * re-checks the session, because a Proxy matcher can be narrowed or bypassed.
 */
export const proxy: NextProxy = (request) => updateSession(request);

export const config = {
  // Everything except build output and static assets, which must never be
  // redirected or have auth cookies attached.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
