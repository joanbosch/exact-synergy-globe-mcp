import { z } from "zod";
import { payloadSchema } from "@schemas/common.js";

export const actionNameSchema = z.string().trim().min(1).max(200);
export const executeActionInput = {
  action: actionNameSchema,
  parameters: payloadSchema.default({}),
};
export const flowInput = {
  operation: actionNameSchema,
  parameters: payloadSchema.default({}),
};
