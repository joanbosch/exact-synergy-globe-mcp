import { describe, expect, it } from "vitest";
import { redact } from "../../src/observability/redaction.js";

describe("redaction", () => {
  it("redacts nested secret keys and authorization strings", () => {
    expect(
      redact({
        password: "secret",
        nested: { Authorization: "Bearer abc.def" },
        url: "https://x/?token=abc&ok=1",
      }),
    ).toEqual({
      password: "[redacted]",
      nested: { Authorization: "[redacted]" },
      url: "https://x/?token=[redacted]&ok=1",
    });
  });
});
