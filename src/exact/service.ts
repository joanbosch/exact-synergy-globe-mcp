import type {
  ExactAction,
  ExactCatalog,
  ExactEntity,
  ExactProperty,
} from "@catalog/catalog-types.js";
import type { CatalogLoader } from "@catalog/catalog-loader.js";
import type { ExactConfig } from "@config/types.js";
import type { AuditLogger } from "@observability/audit.js";
import { buildQuery, type EntityQuery } from "@odata/query-builder.js";
import { decodeCursor, encodeCursor } from "@odata/pagination.js";
import type { AccessPolicy, WriteOperation } from "@policy/access-policy.js";
import { ExactClient } from "@exact/client.js";
import { ExactError } from "@exact/errors.js";
import { parseCollection, unwrapRecord } from "@exact/response.js";

export type EntityKey =
  string | number | boolean | Record<string, string | number | boolean>;

const property = (entity: ExactEntity, name: string): ExactProperty => {
  const result = entity.properties.find((item) => item.name === name);
  if (!result)
    throw new Error(`Unknown property '${name}' for entity '${entity.name}'`);
  return result;
};

function keyLiteral(value: string | number | boolean, type: string): string {
  if (/Guid$/i.test(type)) {
    if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value))
      throw new Error("Invalid GUID entity key");
    return `guid'${value}'`;
  }
  if (/(?:Byte|Int16|Int32|Int64|Decimal|Double|Single)$/i.test(type)) {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error("Invalid numeric entity key");
    return String(value);
  }
  if (/Boolean$/i.test(type)) {
    if (typeof value !== "boolean")
      throw new Error("Invalid boolean entity key");
    return String(value);
  }
  if (typeof value !== "string") throw new Error("Invalid string entity key");
  return `'${value.replace(/'/g, "''")}'`;
}

function keySegment(entity: ExactEntity, key: EntityKey): string {
  if (entity.keys.length === 0)
    throw new Error(`Entity '${entity.name}' has no discoverable key`);
  if (entity.keys.length === 1 && typeof key !== "object") {
    const name = entity.keys[0]!;
    return keyLiteral(key, property(entity, name).type);
  }
  if (!key || typeof key !== "object" || Array.isArray(key))
    throw new Error(`Entity '${entity.name}' requires a composite key object`);
  const supplied = Object.keys(key);
  if (
    supplied.length !== entity.keys.length ||
    entity.keys.some((name) => !(name in key))
  ) {
    throw new Error(
      `Composite key must contain exactly: ${entity.keys.join(", ")}`,
    );
  }
  return entity.keys
    .map(
      (name) =>
        `${name}=${keyLiteral(key[name]!, property(entity, name).type)}`,
    )
    .join(",");
}

function assertPayload(
  entity: ExactEntity,
  payload: Record<string, unknown>,
): void {
  if (Object.keys(payload).length === 0)
    throw new Error("payload must not be empty");
  const known = new Set(entity.properties.map((item) => item.name));
  const unknown = Object.keys(payload).filter((name) => !known.has(name));
  if (unknown.length > 0)
    throw new Error(`Unknown payload properties: ${unknown.join(", ")}`);
  for (const [name, value] of Object.entries(payload)) {
    const item = property(entity, name);
    assertEdmValue(name, item.type, value, item.nullable);
  }
}

function assertEdmValue(
  name: string,
  type: string,
  value: unknown,
  nullable: boolean,
): void {
  if (value === null) {
    if (!nullable) throw new Error(`'${name}' is not nullable`);
    return;
  }
  if (/String$/i.test(type) && typeof value !== "string")
    throw new Error(`'${name}' must be a string`);
  if (/Boolean$/i.test(type) && typeof value !== "boolean")
    throw new Error(`'${name}' must be a boolean`);
  if (
    /(?:Byte|Int16|Int32|Int64|Decimal|Double|Single)$/i.test(type) &&
    (typeof value !== "number" || !Number.isFinite(value))
  )
    throw new Error(`'${name}' must be a finite number`);
  if (
    /Guid$/i.test(type) &&
    (typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ))
  )
    throw new Error(`'${name}' must be a valid GUID`);
  if (
    /(?:DateTime|DateTimeOffset)$/i.test(type) &&
    (typeof value !== "string" || Number.isNaN(Date.parse(value)))
  )
    throw new Error(`'${name}' must be an ISO date string`);
}

function assertActionParameters(
  action: ExactAction,
  parameters: Record<string, unknown>,
): void {
  const expected = new Map(action.parameters.map((item) => [item.name, item]));
  const unknown = Object.keys(parameters).filter((item) => !expected.has(item));
  if (unknown.length > 0)
    throw new Error(`Unknown action parameters: ${unknown.join(", ")}`);
  const missing = action.parameters.filter(
    (item) => !item.nullable && !(item.name in parameters),
  );
  if (missing.length > 0)
    throw new Error(
      `Missing required action parameters: ${missing.map((item) => item.name).join(", ")}`,
    );
  for (const [name, value] of Object.entries(parameters)) {
    const parameter = expected.get(name)!;
    assertEdmValue(name, parameter.type, value, parameter.nullable);
    if (
      action.method === "GET" &&
      value !== null &&
      !["string", "number", "boolean"].includes(typeof value)
    )
      throw new Error(`GET action parameter '${name}' must be a scalar value`);
  }
}

export class ExactService {
  public constructor(
    private readonly config: ExactConfig,
    private readonly client: ExactClient,
    private readonly loader: CatalogLoader,
    private readonly policy: AccessPolicy,
    private readonly audit: AuditLogger,
  ) {}

  public catalog(refresh = false): Promise<ExactCatalog> {
    return this.loader.load(refresh);
  }

  public async entity(name: string): Promise<ExactEntity> {
    const catalog = await this.catalog();
    const entity = catalog.entities.find(
      (item) => item.name === name || item.setName === name,
    );
    if (!entity)
      throw new Error(`Entity '${name}' was not found in live metadata`);
    this.policy.assertEntity(entity);
    return entity;
  }

  public async action(name: string): Promise<ExactAction> {
    const catalog = await this.catalog();
    const action = catalog.actions.find((item) => item.name === name);
    if (!action?.public)
      throw new Error(`Public action '${name}' was not found in live metadata`);
    return action;
  }

  public async getEntity(
    name: string,
    key: EntityKey,
    select?: string[],
  ): Promise<unknown> {
    const entity = await this.entity(name);
    const query = new URLSearchParams();
    if (select?.length) {
      for (const field of select) property(entity, field);
      query.set("$select", select.join(","));
    }
    const response = await this.client.request({
      method: "GET",
      path: `${entity.setName}(${keySegment(entity, key)})`,
      query,
    });
    return unwrapRecord(response.data);
  }

  public async listEntity(
    name: string,
    query: EntityQuery,
    cursor?: string,
  ): Promise<{ records: unknown[]; nextCursor?: string }> {
    const entity = await this.entity(name);
    let path: string | URL = entity.setName;
    let parameters: URLSearchParams | undefined = buildQuery(
      entity,
      query,
      this.config.operation.maxPageSize,
    );
    if (cursor) {
      const base = this.client.baseUrl;
      if (!base)
        throw new ExactError("NOT_CONFIGURED", "Exact is not configured");
      path = decodeCursor(cursor, base);
      parameters = undefined;
    }
    const response = await this.client.request({
      method: "GET",
      path,
      ...(parameters ? { query: parameters } : {}),
    });
    const collection = parseCollection(response.data);
    return {
      records: collection.records,
      ...(collection.nextLink
        ? {
            nextCursor: encodeCursor(
              this.client.resolve(collection.nextLink).href,
            ),
          }
        : {}),
    };
  }

  public async createEntity(
    name: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const entity = await this.entity(name);
    this.policy.assertWrite("create", entity);
    assertPayload(entity, payload);
    try {
      const response = await this.client.request({
        method: "POST",
        path: entity.setName,
        body: payload,
        mutating: true,
      });
      const record = unwrapRecord(response.data);
      const objectRecord =
        record && typeof record === "object"
          ? (record as Record<string, unknown>)
          : {};
      const key =
        entity.keys.length === 1 ? objectRecord[entity.keys[0]!] : undefined;
      let verified = false;
      if (
        typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "boolean"
      ) {
        await this.getEntity(name, key);
        verified = true;
      }
      const identifier =
        typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "boolean"
          ? String(key)
          : undefined;
      this.audit.record({
        operation: "create",
        target: entity.name,
        outcome: "succeeded",
        ...(identifier === undefined ? {} : { identifier }),
      });
      return { record, verified, status: response.status };
    } catch (error) {
      this.auditFailure("create", entity.name, error);
      throw error;
    }
  }

  public async updateEntity(
    name: string,
    key: EntityKey,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const entity = await this.entity(name);
    this.policy.assertWrite("update", entity);
    assertPayload(entity, payload);
    try {
      const response = await this.client.request({
        method: "PATCH",
        path: `${entity.setName}(${keySegment(entity, key)})`,
        body: payload,
        mutating: true,
      });
      const verifiedRecord = await this.getEntity(name, key);
      this.audit.record({
        operation: "update",
        target: entity.name,
        outcome: "succeeded",
        identifier: JSON.stringify(key),
      });
      return {
        record: verifiedRecord,
        verified: true,
        status: response.status,
      };
    } catch (error) {
      this.auditFailure("update", entity.name, error);
      throw error;
    }
  }

  public async deleteEntity(
    name: string,
    key: EntityKey,
  ): Promise<Record<string, unknown>> {
    const entity = await this.entity(name);
    this.policy.assertWrite("delete", entity);
    try {
      const response = await this.client.request({
        method: "DELETE",
        path: `${entity.setName}(${keySegment(entity, key)})`,
        mutating: true,
      });
      this.audit.record({
        operation: "delete",
        target: entity.name,
        outcome: "succeeded",
        identifier: JSON.stringify(key),
      });
      return {
        deleted: true,
        verified: response.status === 204,
        status: response.status,
      };
    } catch (error) {
      this.auditFailure("delete", entity.name, error);
      throw error;
    }
  }

  public async executeAction(
    name: string,
    parameters: Record<string, unknown>,
  ): Promise<unknown> {
    const action = await this.action(name);
    this.policy.assertWrite("executeAction", action);
    assertActionParameters(action, parameters);
    try {
      const response = await this.client.request({
        method: action.method,
        path: action.name,
        ...(action.method === "GET"
          ? {
              query: new URLSearchParams(
                Object.entries(parameters).map(([key, value]) => [
                  key,
                  String(value),
                ]),
              ),
            }
          : { body: parameters, mutating: true }),
      });
      if (action.method === "POST")
        this.audit.record({
          operation: "executeAction",
          target: action.name,
          outcome: "succeeded",
        });
      return unwrapRecord(response.data);
    } catch (error) {
      if (action.method === "POST")
        this.auditFailure("executeAction", action.name, error);
      throw error;
    }
  }

  private auditFailure(
    operation: WriteOperation,
    target: string,
    error: unknown,
  ): void {
    const unknown = error instanceof ExactError && error.outcomeUnknown;
    this.audit.record({
      operation,
      target,
      outcome: unknown ? "unknown" : "failed",
    });
  }
}
