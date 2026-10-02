/**
 * Application-wide error types and safe error mapping.
 *
 * Route handlers and server actions should throw or return `AppError` so that
 * internal details (Supabase messages, OpenAI payloads, stack traces) are never
 * leaked to the browser. `toErrorResponse` is the single place that converts an
 * unknown throwable into a client-safe response.
 */

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "ai_unavailable"
  | "internal";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  ai_unavailable: 503,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Convert any throwable into a client-safe error body plus an HTTP status.
 * `AppError` messages are safe to surface; everything else is replaced with a
 * generic message so internals stay server-side.
 */
export function toErrorResponse(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
): { status: number; body: ErrorResponseBody } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } },
    };
  }

  console.error("[tutormatch] unhandled error", error);

  return {
    status: 500,
    body: { error: { code: "internal", message: fallbackMessage } },
  };
}
