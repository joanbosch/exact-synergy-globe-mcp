import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { normalizeExactError } from "../../src/exact/errors.js";

describe("Exact errors", () => {
  it("marks interrupted mutations as unknown and does not suggest an automatic retry", () => {
    const error = normalizeExactError(
      new AxiosError("timeout", "ECONNABORTED"),
      true,
    );
    expect(error.code).toBe("UNKNOWN_OUTCOME");
    expect(error.outcomeUnknown).toBe(true);
    expect(error.message).toMatch(/inspect Exact before retrying/);
  });
});
