import axios from "axios";

export type ExactErrorCode =
  | "NOT_CONFIGURED"
  | "AUTHENTICATION_FAILED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "INVALID_RESPONSE"
  | "RESPONSE_TOO_LARGE"
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_OUTCOME";

export class ExactError extends Error {
  public constructor(
    public readonly code: ExactErrorCode,
    message: string,
    public readonly status?: number,
    public readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = "ExactError";
  }
}

export function normalizeExactError(
  error: unknown,
  mutating: boolean,
): ExactError {
  if (error instanceof ExactError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401)
      return new ExactError(
        "AUTHENTICATION_FAILED",
        "Exact rejected the configured credentials",
        status,
      );
    if (status === 403)
      return new ExactError(
        "PERMISSION_DENIED",
        "The Exact account is not permitted to perform this operation",
        status,
      );
    if (status === 404)
      return new ExactError(
        "NOT_FOUND",
        "The requested Exact endpoint or record was not found",
        status,
      );
    const timedOut =
      error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    if (mutating && (!error.response || timedOut)) {
      return new ExactError(
        "UNKNOWN_OUTCOME",
        "The mutable request may have reached Exact, so its outcome is unknown; inspect Exact before retrying",
        status,
        true,
      );
    }
    if (timedOut)
      return new ExactError("TIMEOUT", "The Exact request timed out", status);
    if (!error.response)
      return new ExactError(
        "NETWORK_ERROR",
        "Could not reach the configured Exact API",
      );
    return new ExactError(
      "HTTP_ERROR",
      `Exact returned HTTP ${String(status ?? "error")}`,
      status,
    );
  }
  return new ExactError(
    "NETWORK_ERROR",
    "The Exact request failed unexpectedly",
  );
}
