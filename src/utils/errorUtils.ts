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

function genericMessageForStatus(status: number, action?: string): string {
  if (status === 401 || status === 404) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (status === 409) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (status === 400) {
    return action?.includes("sign")
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
