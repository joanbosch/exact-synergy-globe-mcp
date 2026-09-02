import { describe, expect, it } from "vitest";
import { loadConfig, safeEnvironmentSummary } from "@config/env.js";

describe("configuration", () => {
  it("starts safely without a live connection", () => {
    const config = loadConfig({});
    expect(config.connection.configured).toBe(false);
    expect(config.policy.readOnly).toBe(true);
    expect(config.policy.allowDelete).toBe(false);
  });

  it("requires all NTLM fields when a base URL is configured", () => {
    expect(() =>
      loadConfig({ EXACT_API_BASE_URL: "https://exact.example.test/api" }),
    ).toThrow(
      /EXACT_API_DOMAIN.*EXACT_API_DB_SERVER.*EXACT_API_DB_NAME.*EXACT_API_USERNAME.*EXACT_API_PASSWORD/,
    );
  });

  it("rejects contradictory write configuration", () => {
    expect(() => loadConfig({ EXACT_ALLOW_CREATE: "true" })).toThrow(
      /EXACT_READ_ONLY=true/,
    );
  });

  it("does not expose secret values in summaries", () => {
    expect(
      safeEnvironmentSummary({
        EXACT_API_PASSWORD: "do-not-print",
        EXACT_API_ACCESS_TOKEN: "token",
        EXACT_API_KIND: "globe",
      }),
    ).toEqual({
      EXACT_API_PASSWORD: "[configured]",
      EXACT_API_ACCESS_TOKEN: "[configured]",
      EXACT_API_KIND: "globe",
    });
  });
});
