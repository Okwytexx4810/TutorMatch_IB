/**
 * Shape returned by every authentication Server Action.
 *
 * Kept deliberately small and serialisable. It carries messages written here,
 * never a Supabase error object, so internal details cannot reach the browser
 * through a rejected action.
 */
export interface AuthFormState {
  status: "idle" | "error" | "success";
  /** Human-readable summary, safe to render. */
  message?: string;
  /** Per-field messages keyed by form field name. */
  fieldErrors?: Record<string, string[]>;
}

export const initialAuthFormState: AuthFormState = { status: "idle" };

export function authFailure(
  message: string,
  fieldErrors?: Record<string, string[]>,
): AuthFormState {
  return { status: "error", message, fieldErrors };
}

export function authSuccess(message: string): AuthFormState {
  return { status: "success", message };
}
