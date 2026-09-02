import { z } from "zod";

export const capabilityStatusSchema = z.enum([
  "detected",
  "verified",
  "restricted",
  "unavailable",
]);

export const propertySchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  maxLength: z.number().int().positive().optional(),
});

export const entitySchema = z.object({
  name: z.string(),
  setName: z.string(),
  namespace: z.string(),
  keys: z.array(z.string()),
  properties: z.array(propertySchema),
  readable: z.boolean(),
  writable: z.boolean(),
});

export const actionParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
});

export const actionSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  method: z.enum(["GET", "POST"]),
  parameters: z.array(actionParameterSchema),
  returnType: z.string().optional(),
  public: z.boolean(),
});

export const catalogSchema = z.object({
  product: z.enum(["auto", "synergy", "globe"]),
  source: z.enum(["live", "cache", "unconfigured"]),
  loadedAt: z.iso.datetime(),
  metadataUrl: z.url().optional(),
  version: z.string().optional(),
  entities: z.array(entitySchema),
  actions: z.array(actionSchema),
  capabilities: z.record(z.string(), capabilityStatusSchema),
});

export type ExactProperty = z.infer<typeof propertySchema>;
export type ExactEntity = z.infer<typeof entitySchema>;
export type ExactAction = z.infer<typeof actionSchema>;
export type ExactCatalog = z.infer<typeof catalogSchema>;
export type CapabilityStatus = z.infer<typeof capabilityStatusSchema>;
