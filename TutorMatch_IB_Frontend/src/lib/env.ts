import { z } from "zod";

/**
 * Centralised, validated access to environment variables.
 *
 * Rules enforced here:
 * - Anything prefixed with `NEXT_PUBLIC_` is safe to read in a Client
 *   Component and will be inlined into the browser bundle.
 * - Everything else is server-only. Importing this module from a Client
 *   Component and reading a secret will surface as a build/runtime error,
 *   never as a silent leak.
 *
 * `serverEnv()` is intentionally a function rather than a top-level const so
 * that merely importing this file during a build does not throw when a
 * deployment has not yet been given its secrets.
 */

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Read and validate server-only environment variables.
 *
 * @throws {z.ZodError} when a value is present but malformed.
 */
export function serverEnv(): ServerEnv {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}

/**
 * The bare project URL, e.g. `https://<ref>.supabase.co`.
 *
 * supabase-js appends its own paths (`/auth/v1`, `/rest/v1`) to whatever URL it
 * is given, so the "REST endpoint" value copied from the dashboard - which ends
 * in `/rest/v1/` - silently turns every auth call into a request to
 * `/rest/v1/auth/v1/...`, which does not exist and 404s. `z.string().url()`
 * accepts that value happily, which is why the shape is enforced here rather
 * than assumed from a URL check.
 */
const supabaseProjectUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).pathname === "/", {
    message:
      "Must be the bare project URL (https://<ref>.supabase.co), with no trailing path such as /rest/v1/",
  });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseProjectUrlSchema,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3001"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readPublicEnvSource(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };
}

/**
 * Read and validate browser-safe environment variables.
 *
 * These are the only values a Client Component may rely on. Supabase's
 * publishable key is safe to ship because Row Level Security is the real access
 * control boundary; the service role key is not, and must never be public.
 *
 * @throws {z.ZodError} when Supabase has not been configured.
 */
export function publicEnv(): PublicEnv {
  return publicEnvSchema.parse(readPublicEnvSource());
}

/**
 * Whether the public Supabase variables are present and well formed.
 *
 * Checked instead of caught, because a build or a marketing page render must not
 * depend on Supabase being configured. Callers use this to degrade honestly
 * rather than to silently skip an authorization check.
 */
export function isSupabaseConfigured(): boolean {
  return publicEnvSchema.safeParse(readPublicEnvSource()).success;
}
