import { z } from "zod";

import { PUBLIC_ROLES } from "@/lib/auth/roles";

/**
 * Zod schemas for every authentication payload.
 *
 * These are the only place a raw `FormData` becomes trusted input. Nothing is
 * passed to Supabase before it has been through one of these, and passwords are
 * always forwarded to Supabase Auth rather than stored, logged or inspected.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.")
  // Normalised so sign-in and sign-up always resolve to the same account.
  .toLowerCase();

/**
 * Minimum length only. Strength rules beyond a length floor belong in Supabase
 * Auth, and a second, stricter rule here would only disagree with it.
 */
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords are limited to 72 characters.");

const confirmation = z.string().min(1, "Confirm your password.");

/** Publicly registrable roles only. `admin` cannot be chosen or submitted. */
const role = z.enum(PUBLIC_ROLES, {
  error: "Choose whether you are a student, parent or tutor.",
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Keep your name under 80 characters."),
    email,
    password: newPassword,
    confirmPassword: confirmation,
    role,
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
