import { describe, expect, it } from "vitest";
import type {
  ExactAction,
  ExactEntity,
} from "../../src/catalog/catalog-types.js";
import { AccessPolicy } from "../../src/policy/access-policy.js";

const entity: ExactEntity = {
  name: "Account",
  setName: "Accounts",
  namespace: "Exact",
  keys: [],
  properties: [],
  readable: true,
  writable: false,
};
const action: ExactAction = {
  name: "Approve",
  namespace: "Exact",
  method: "POST",
  parameters: [],
  public: true,
};

describe("access policy", () => {
  it("denies every write in default read-only mode", () => {
    const policy = new AccessPolicy({
      readOnly: true,
      allowCreate: false,
      allowUpdate: false,
      allowDelete: false,
      allowExecuteAction: false,
    });
    expect(() => policy.assertWrite("create", entity)).toThrow(
      /readOnly|READ_ONLY/i,
    );
  });

  it("requires action allowlisting even when execution is enabled", () => {
    const policy = new AccessPolicy({
      readOnly: false,
      allowCreate: false,
      allowUpdate: false,
      allowDelete: false,
      allowExecuteAction: true,
    });
    expect(() => policy.assertWrite("executeAction", action)).toThrow(
      /explicitly allowed/,
    );
  });
});
