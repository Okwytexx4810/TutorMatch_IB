"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { z } from "zod";

import {
  authFailure,
  authSuccess,
  type AuthFormState,
} from "@/lib/auth/action-state";
import { authErrorMessage } from "@/lib/auth/errors";
import { homeForRole, intendedRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/site-config";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

/**
 * Authentication Server Actions.
 *
 * Shared rules, enforced by construction rather than by convention:
 *
 * - Every input is parsed with Zod before Supabase is called.
 * - The role is validated against `PUBLIC_ROLES`, so `admin` cannot be
 *   self-assigned by tampering with the form.
 * - Passwords are handed straight to Supabase Auth. They are never stored,
 *   logged, hashed or compared here.
 * - Errors are mapped through `authErrorMessage`, so no Supabase internals leak.
 *
 * Identity is resolved server-side. A user id in a payload is treated as a hint,
 * never as proof.
 */

/** Reads a string field without assuming it exists. */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The origin Supabase should return the user to.
 *
 * Taken from the request `Origin` header, falling back to `Host`. Never from a
 * form field, because a client-supplied redirect target is an open redirect.
 */
async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("origin") ??
    (headerList.get("host") ? `https://${headerList.get("host")}` : ROUTES.home);
  return host.replace(/\/$/, "");
}

/**
 * Sanitise the `next` query parameter.
 *
 * Only same-site absolute paths are allowed, so `?next=https://evil.example`
 * cannot turn the login flow into an open redirect. The cast is safe because
 * the checks above leave nothing but a site-relative path.
 */
function safeNextPath(candidate: FormDataEntryValue | string | null): Route | "" {
  if (typeof candidate !== "string") return "";
  if (!candidate.startsWith("/")) return "";
  if (candidate.startsWith("//")) return "";
  return candidate as Route;
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/*  Sign in                                                                   */
/* -------------------------------------------------------------------------- */

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });

  if (!parsed.success) {
    return authFailure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const supabase = await getServerSupabase();

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return authFailure(authErrorMessage(error, "signIn"));
  }

  const next = safeNextPath(formData.get("next"));
  const destination = next || homeForRole(intendedRole(data.user));

  revalidatePath("/", "layout");
  redirect(destination);
}

/* -------------------------------------------------------------------------- */
/*  Register                                                                  */
/* -------------------------------------------------------------------------- */

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    confirmPassword: field(formData, "confirmPassword"),
    role: field(formData, "role"),
  });

  if (!parsed.success) {
    return authFailure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const { fullName, email, password, role } = parsed.data;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await requestOrigin()}${ROUTES.authCallback}`,
      // `role` here is the validated public value, never a client-supplied
      // string. Phase 4 copies it onto `profiles.role` under RLS; until then it
      // is a UX hint stored in user metadata and nothing more.
      data: { full_name: fullName, role },
    },
  });

  if (error) {
    return authFailure(authErrorMessage(error, "signUp"));
  }

  // A session is only returned when email confirmation is disabled in Supabase.
  if (!data.session) {
    return authSuccess("Check your inbox to confirm your email, then sign in.");
  }

  revalidatePath("/", "layout");
  redirect(homeForRole(role));
}

/* -------------------------------------------------------------------------- */
/*  Password reset request                                                    */
/* -------------------------------------------------------------------------- */

export async function forgotPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: field(formData, "email"),
  });

  if (!parsed.success) {
    return authFailure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const supabase = await getServerSupabase();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await requestOrigin()}${ROUTES.resetPassword}`,
  });

  if (error) {
    return authFailure(authErrorMessage(error, "passwordReset"));
  }

  // Deliberately identical whether or not the address exists, so this endpoint
  // cannot be used to discover which emails are registered.
  return authSuccess(
    "If that email has an account, a password reset link is on its way.",
  );
}

/* -------------------------------------------------------------------------- */
/*  Set a new password                                                        */
/* -------------------------------------------------------------------------- */

export async function resetPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: field(formData, "password"),
    confirmPassword: field(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return authFailure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  // Reaching this page at all requires the recovery session that the auth
  // callback established from the emailed link.
  const user = await requireUser(ROUTES.resetPassword);
  const supabase = await getServerSupabase();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return authFailure(authErrorMessage(error, "passwordReset"));
  }

  revalidatePath("/", "layout");
  redirect(homeForRole(intendedRole(user)));
}

/* -------------------------------------------------------------------------- */
/*  Sign out                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sign out everywhere.
 *
 * Revokes the Supabase session and refresh tokens rather than only deleting the
 * local cookie, so a stolen refresh token stops working. Reused verbatim by the
 * student, tutor and admin dashboards.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut({ scope: "global" });

  revalidatePath("/", "layout");
  redirect(ROUTES.home);
}
