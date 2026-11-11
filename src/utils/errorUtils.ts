/**
 * User-facing error message helpers (mirrors savetheplate-frontend/utils/errorUtils.ts)
 */

export function isTechnicalError(message: string): boolean {
  if (!message) return false;

  const technicalIndicators = [
    "Error:",
    "Exception:",
    "HttpException:",
    "BadRequestException:",
    "at ",
    "Stack trace",
    "TypeError",
    "ReferenceError",
    "SyntaxError",
    "NetworkError",
    "CORS",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "statusCode",
    "timestamp",
    "Unexpected token",
    "JSON.parse",
    "undefined is not",
    "Cannot read property",
    "is not a function",
    "node_modules",
  ];

  const lower = message.toLowerCase();
  if (message.trim().startsWith("{") && message.includes('"statusCode"')) return true;
  return technicalIndicators.some((indicator) => lower.includes(indicator.toLowerCase()));
}

function isAuthAction(action?: string): boolean {
  if (!action) return false;
  const lower = action.toLowerCase();
  return (
    lower.includes("sign in") ||
    lower.includes("sign up") ||
    lower.includes("signin") ||
    lower.includes("signup") ||
    lower.includes("login") ||
    lower.includes("authenticate") ||
    lower.includes("password")
  );
}

function genericMessageForStatus(status: number, action?: string): string {
  const auth = isAuthAction(action);

  if (status === 401) {
    return auth
      ? "Invalid email or password. Please check your credentials and try again."
      : "Your session has expired. Please sign in again.";
  }
  if (status === 404) {
    return auth
      ? "Invalid email or password. Please check your credentials and try again."
      : "The requested item was not found.";
  }
  if (status === 409) {
    return auth
      ? "An account with this email already exists. Please sign in instead."
      : "This action conflicts with current data. Please refresh and try again.";
  }
  if (status === 400) {
    return auth
      ? "Unable to create account. Please check your information and try again."
      : "Invalid request. Please check your input and try again.";
  }
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "Server error. Please try again in a moment.";
  return "Something went wrong. Please try again.";
}

function pickUserMessage(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const joined = value.map(String).filter(Boolean).join(", ");
    return joined || null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || isTechnicalError(trimmed)) return null;
  if (trimmed.length > 200) return null;
  return trimmed;
}

export function extractMessageFromApiBody(body: unknown, status: number, action?: string): string {
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return extractMessageFromApiBody(parsed, status, action);
    } catch {
      const direct = pickUserMessage(body);
      return direct || genericMessageForStatus(status, action);
    }
  }

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    const fromMessage = pickUserMessage(data.message);
    if (fromMessage) return fromMessage;

    const fromError = pickUserMessage(data.error);
    if (fromError) return fromError;
  }

  return genericMessageForStatus(status, action);
}

export function sanitizeErrorMessage(
  error: unknown,
  context: { action?: string; defaultMessage?: string } = {}
): string {
  const { action, defaultMessage } = context;

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const err = error as { message?: string; status?: number; body?: unknown };
    if (err.body) {
      return extractMessageFromApiBody(err.body, err.status || 0, action);
    }
    if (typeof err.message === "string") {
      if (err.message.trim().startsWith("{")) {
        try {
          return extractMessageFromApiBody(JSON.parse(err.message), err.status || 0, action);
        } catch {
          // fall through
        }
      }
      const msg = pickUserMessage(err.message);
      if (msg) return msg;
    }
  }

  if (typeof error === "string") {
    const msg = pickUserMessage(error);
    if (msg) return msg;
  }

  return defaultMessage || genericMessageForStatus(0, action);
}

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
