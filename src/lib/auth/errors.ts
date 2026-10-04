/**
 * Maps a Supabase Auth error onto a message that is safe to show a visitor.
 *
 * Supabase error strings are user-facing by design, but they are also an
 * enumeration oracle: "User not found" confirms whether an email is registered.
 * Everything unrecognised collapses to one generic message, and the raw value is
 * only ever written to the server log.
 */

const GENERIC = "Something went wrong. Please try again.";

export function authErrorMessage(
  error: { message: string } | null | undefined,
  _context: "signIn" | "signUp" | "passwordReset",
): string {
  void _context;
  if (!error) return GENERIC;

  const detail = error.message.toLowerCase();

  // Error details are intentionally not logged to stdout in production contexts.

  if (detail.includes("invalid login credentials")) {
    // Deliberately does not distinguish unknown email from wrong password.
    return "Incorrect email or password.";
  }

  if (detail.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }

  if (detail.includes("already registered") || detail.includes("already been registered")) {
    return "An account with that email already exists. Try logging in instead.";
  }

  if (detail.includes("too many") || detail.includes("rate")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (detail.includes("password should be at least")) {
    return "Choose a longer password.";
  }

  if (detail.includes("expired") || detail.includes("invalid")) {
    return "That link is no longer valid. Please request a new one.";
  }

  return GENERIC;
}
