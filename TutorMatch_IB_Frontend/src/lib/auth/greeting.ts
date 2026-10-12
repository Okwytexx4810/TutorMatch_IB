/**
 * The name every dashboard greets a signed-in user by.
 *
 * Prefers the account's own name (`profiles.full_name`) so students, parents and
 * tutors all greet the same way, then a role display name (tutors may set one),
 * then the local part of the email, then a neutral "there".
 */
export function greetingName({
  fullName,
  displayName,
  email,
}: {
  fullName?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  return (
    fullName?.trim() ||
    displayName?.trim() ||
    email?.split("@")[0]?.trim() ||
    "there"
  );
}
