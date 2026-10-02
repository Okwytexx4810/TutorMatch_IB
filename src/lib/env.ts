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

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Read and validate browser-safe environment variables.
 *
 * These are the only values a Client Component may rely on. Supabase's anon
 * key is safe to ship because Row Level Security is the real access control
 * boundary; the service role key is not, and must never be public.
 */
export function publicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
