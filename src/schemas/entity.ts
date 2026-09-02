import { z } from "zod";
import { filterSchema } from "@odata/filter-schema.js";
import {
  entityKeySchema,
  entityNameSchema,
  fieldsSchema,
  payloadSchema,
} from "@schemas/common.js";

export const getEntityInput = {
  entity: entityNameSchema,
  key: entityKeySchema,
  select: fieldsSchema,
};

export const listEntityInput = {
  entity: entityNameSchema,
  select: fieldsSchema,
  filter: filterSchema.optional(),
  orderBy: z
    .array(
      z.object({
        field: z.string().trim().min(1),
        direction: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .max(10)
    .optional(),
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional(),
  cursor: z.string().min(1).max(16_384).optional(),
};

export const createEntityInput = {
  entity: entityNameSchema,
  payload: payloadSchema,
};
export const updateEntityInput = {
  entity: entityNameSchema,
  key: entityKeySchema,
  payload: payloadSchema,
};
export const deleteEntityInput = {
  entity: entityNameSchema,
  key: entityKeySchema,
};
