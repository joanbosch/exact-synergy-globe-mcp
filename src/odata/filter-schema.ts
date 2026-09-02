import { z } from "zod";

export const comparisonOperatorSchema = z.enum([
  "eq",
  "ne",
  "gt",
  "ge",
  "lt",
  "le",
]);
export const stringOperatorSchema = z.enum([
  "contains",
  "startsWith",
  "endsWith",
]);

export type Filter =
  | {
      field: string;
      op: z.infer<typeof comparisonOperatorSchema>;
      value: unknown;
    }
  | { field: string; op: z.infer<typeof stringOperatorSchema>; value: string }
  | { op: "and" | "or"; filters: Filter[] }
  | { op: "not"; filter: Filter };

export const filterSchema: z.ZodType<Filter> = z.lazy(() =>
  z.union([
    z.object({
      field: z.string().min(1),
      op: comparisonOperatorSchema,
      value: z.unknown(),
    }),
    z.object({
      field: z.string().min(1),
      op: stringOperatorSchema,
      value: z.string(),
    }),
    z.object({
      op: z.enum(["and", "or"]),
      filters: z.array(filterSchema).min(1).max(20),
    }),
    z.object({ op: z.literal("not"), filter: filterSchema }),
  ]),
);
