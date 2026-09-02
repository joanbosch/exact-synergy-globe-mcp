import { XMLParser } from "fast-xml-parser";
import {
  catalogSchema,
  type ExactAction,
  type ExactCatalog,
  type ExactEntity,
} from "../catalog/catalog-types.js";
import type { ExactApiKind } from "../config/types.js";
import { ExactError } from "../exact/errors.js";

type XmlNode = Record<string, unknown>;

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const object = (value: unknown): XmlNode =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as XmlNode)
    : {};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const bool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  return typeof value === "string" ? value.toLowerCase() !== "false" : fallback;
};

const number = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

function isPublicAction(name: string, node: XmlNode): boolean {
  if (
    /^(?:_|internal|private|system)/i.test(name) ||
    /(?:internal|private)/i.test(name)
  )
    return false;
  const annotations = JSON.stringify(node.Annotation ?? "");
  return !/internal|private/i.test(annotations);
}

export function parseMetadata(
  xml: string,
  product: ExactApiKind,
  metadataUrl?: string,
): ExactCatalog {
  let document: XmlNode;
  try {
    document = object(
      new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        removeNSPrefix: true,
        parseAttributeValue: false,
        trimValues: true,
      }).parse(xml),
    );
  } catch {
    throw new ExactError(
      "INVALID_RESPONSE",
      "Exact returned invalid metadata XML",
    );
  }

  const edmx = object(document.Edmx ?? document.edmx);
  const dataServices = object(edmx.DataServices ?? document.DataServices);
  const schemas = asArray(
    dataServices.Schema as XmlNode | XmlNode[] | undefined,
  ).map(object);
  if (schemas.length === 0) {
    throw new ExactError(
      "INVALID_RESPONSE",
      "Exact metadata did not contain an Entity Data Model schema",
    );
  }

  const entityTypes = new Map<string, ExactEntity>();
  for (const schema of schemas) {
    const namespace = text(schema.Namespace) ?? "Exact";
    for (const rawType of asArray(
      schema.EntityType as XmlNode | XmlNode[] | undefined,
    ).map(object)) {
      const name = text(rawType.Name);
      if (!name) continue;
      const keys = asArray(
        object(rawType.Key).PropertyRef as XmlNode | XmlNode[] | undefined,
      )
        .map(object)
        .map((item) => text(item.Name))
        .filter((item): item is string => item !== undefined);
      const properties = asArray(
        rawType.Property as XmlNode | XmlNode[] | undefined,
      )
        .map(object)
        .flatMap((item) => {
          const propertyName = text(item.Name);
          const propertyType = text(item.Type);
          if (!propertyName || !propertyType) return [];
          const maxLength = number(item.MaxLength);
          return [
            {
              name: propertyName,
              type: propertyType,
              nullable: bool(item.Nullable, true),
              ...(maxLength === undefined ? {} : { maxLength }),
            },
          ];
        });
      entityTypes.set(`${namespace}.${name}`, {
        name,
        setName: name,
        namespace,
        keys,
        properties,
        readable: true,
        writable: false,
      });
    }
  }

  for (const schema of schemas) {
    for (const container of asArray(
      schema.EntityContainer as XmlNode | XmlNode[] | undefined,
    ).map(object)) {
      for (const rawSet of asArray(
        container.EntitySet as XmlNode | XmlNode[] | undefined,
      ).map(object)) {
        const setName = text(rawSet.Name);
        const typeName = text(rawSet.EntityType);
        if (!setName || !typeName) continue;
        const entity = entityTypes.get(typeName);
        if (entity) entityTypes.set(typeName, { ...entity, setName });
      }
    }
  }

  const actions: ExactAction[] = [];
  for (const schema of schemas) {
    const namespace = text(schema.Namespace) ?? "Exact";
    const candidates = [
      ...asArray(schema.Action as XmlNode | XmlNode[] | undefined).map(
        (node) => ({ node: object(node), method: "POST" as const }),
      ),
      ...asArray(schema.Function as XmlNode | XmlNode[] | undefined).map(
        (node) => ({ node: object(node), method: "GET" as const }),
      ),
    ];
    for (const container of asArray(
      schema.EntityContainer as XmlNode | XmlNode[] | undefined,
    ).map(object)) {
      candidates.push(
        ...asArray(
          container.FunctionImport as XmlNode | XmlNode[] | undefined,
        ).map((node) => {
          const item = object(node);
          const method =
            (
              text(item.HttpMethod) ??
              text(item.Method) ??
              "GET"
            ).toUpperCase() === "POST"
              ? "POST"
              : "GET";
          return { node: item, method } as const;
        }),
      );
    }
    for (const candidate of candidates) {
      const name = text(candidate.node.Name);
      if (!name) continue;
      const parameters = asArray(
        candidate.node.Parameter as XmlNode | XmlNode[] | undefined,
      )
        .map(object)
        .flatMap((item) => {
          const parameterName = text(item.Name);
          const parameterType = text(item.Type);
          return parameterName && parameterType
            ? [
                {
                  name: parameterName,
                  type: parameterType,
                  nullable: bool(item.Nullable, true),
                },
              ]
            : [];
        });
      const returnTypeNode = object(candidate.node.ReturnType);
      const returnType =
        text(candidate.node.ReturnType) ?? text(returnTypeNode.Type);
      actions.push({
        name,
        namespace,
        method: candidate.method,
        parameters,
        ...(returnType ? { returnType } : {}),
        public: isPublicAction(name, candidate.node),
      });
    }
  }

  return catalogSchema.parse({
    product,
    source: "live",
    loadedAt: new Date().toISOString(),
    ...(metadataUrl ? { metadataUrl } : {}),
    entities: [...entityTypes.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    actions: actions.filter(
      (action, index) =>
        actions.findIndex((item) => item.name === action.name) === index,
    ),
    capabilities: {
      connectivity: "verified",
      metadata: "verified",
      entityRead: entityTypes.size > 0 ? "detected" : "unavailable",
      actions: actions.some((action) => action.public)
        ? "detected"
        : "unavailable",
    },
  });
}
