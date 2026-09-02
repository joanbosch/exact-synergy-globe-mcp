export type ExactRequest = Readonly<{
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string | URL;
  query?: URLSearchParams;
  body?: unknown;
  mutating?: boolean;
  accept?: string;
}>;
