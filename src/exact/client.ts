import type { AxiosInstance, AxiosResponse } from "axios";
import type { ExactConfig } from "@config/types.js";
import type { Logger } from "@observability/logger.js";
import { createAuthProvider } from "@exact/auth/index.js";
import { ExactError, normalizeExactError } from "@exact/errors.js";
import type { ExactRequest } from "@exact/request.js";

export class ExactClient {
  private readonly http: AxiosInstance | undefined;

  public constructor(
    private readonly config: ExactConfig,
    private readonly logger: Logger,
    client?: AxiosInstance,
  ) {
    this.http = config.connection.configured
      ? (client ?? createAuthProvider(config).createClient())
      : undefined;
  }

  public get configured(): boolean {
    return this.config.connection.configured;
  }

  public get baseUrl(): URL | undefined {
    return this.config.connection.baseUrl;
  }

  public metadataUrl(): URL {
    return this.resolve("$metadata");
  }

  public resolve(path: string | URL): URL {
    const base = this.config.connection.baseUrl;
    if (!base)
      throw new ExactError(
        "NOT_CONFIGURED",
        "Exact is not configured; set EXACT_API_BASE_URL and authentication variables",
      );
    const normalizedBase = base.href.endsWith("/")
      ? base
      : new URL(`${base.href}/`);
    const resolved =
      path instanceof URL
        ? new URL(path.href)
        : new URL(path.replace(/^\//, ""), normalizedBase);
    if (
      resolved.origin !== base.origin ||
      !resolved.pathname.startsWith(normalizedBase.pathname)
    ) {
      throw new ExactError(
        "HTTP_ERROR",
        "Exact request URL escaped the configured API base path",
      );
    }
    return resolved;
  }

  public async request(request: ExactRequest): Promise<
    Readonly<{
      data: unknown;
      headers: Record<string, unknown>;
      status: number;
    }>
  > {
    if (!this.http)
      throw new ExactError(
        "NOT_CONFIGURED",
        "Exact is not configured; set EXACT_API_BASE_URL and authentication variables",
      );
    const url = this.resolve(request.path);
    if (request.query) url.search = request.query.toString();
    const method = request.method;
    this.logger.debug("Exact request", {
      method,
      url: `${url.origin}${url.pathname}`,
      mutating: request.mutating === true,
    });
    let response: AxiosResponse<unknown>;
    try {
      response = await this.http.request<unknown>({
        method,
        url: url.href,
        ...(request.body === undefined ? {} : { data: request.body }),
        timeout: this.config.operation.requestTimeoutMs,
        maxRedirects: 0,
        maxContentLength: this.config.operation.maxResponseBytes,
        maxBodyLength: this.config.operation.maxResponseBytes,
        responseType: request.accept === "application/xml" ? "text" : "json",
        headers: {
          Accept: request.accept ?? "application/json",
          ...(request.body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(this.config.connection.dbServer
            ? { ServerName: this.config.connection.dbServer }
            : {}),
          ...(this.config.connection.dbName
            ? { DatabaseName: this.config.connection.dbName }
            : {}),
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });
    } catch (error) {
      const normalized = normalizeExactError(error, request.mutating === true);
      this.logger.warn("Exact request failed", {
        method,
        path: url.pathname,
        code: normalized.code,
        status: normalized.status,
      });
      throw normalized;
    }
    return {
      data: response.data,
      headers: response.headers,
      status: response.status,
    };
  }

  public async metadata(): Promise<string> {
    const response = await this.request({
      method: "GET",
      path: "$metadata",
      accept: "application/xml",
    });
    if (typeof response.data !== "string")
      throw new ExactError(
        "INVALID_RESPONSE",
        "Exact metadata response was not XML text",
      );
    return response.data;
  }
}
