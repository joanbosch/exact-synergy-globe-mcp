import { z } from "zod";

export const entityNameSchema = z.string().trim().min(1).max(200);
export const fieldsSchema = z
  .array(z.string().trim().min(1).max(200))
  .min(1)
  .max(100)
  .optional();
export const entityKeySchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
]);
export const payloadSchema = z.record(z.string(), z.unknown());
