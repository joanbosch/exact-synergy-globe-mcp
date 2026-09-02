import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { capabilities } from "@catalog/capability-resolver.js";
import type { ExactConfig } from "@config/types.js";
import type { ExactService } from "@exact/service.js";
import type { AccessPolicy } from "@policy/access-policy.js";
import { executeActionInput, flowInput } from "@schemas/action.js";
import { entityNameSchema } from "@schemas/common.js";
import {
  createEntityInput,
  deleteEntityInput,
  getEntityInput,
  listEntityInput,
  updateEntityInput,
} from "@schemas/entity.js";
import { safely } from "@tools/tool-result.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;
const DELETE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerTools(
  server: McpServer,
  service: ExactService,
  config: ExactConfig,
  policy: AccessPolicy,
): void {
  server.registerTool(
    "exact_get_server_info",
    {
      description:
        "Check configuration, connectivity, product selection, and live metadata availability without exposing connection secrets.",
      inputSchema: { refresh: z.boolean().default(false) },
      annotations: READ_ONLY,
    },
    ({ refresh }) =>
      safely(async () => {
        const catalog = await service.catalog(refresh);
        return {
          configured: config.connection.configured,
          requestedProduct: config.connection.kind,
          authentication: config.connection.auth,
          connected: catalog.source === "live",
          metadataSource: catalog.source,
          loadedAt: catalog.loadedAt,
          entityCount: catalog.entities.length,
          publicActionCount: catalog.actions.filter((action) => action.public)
            .length,
        };
      }),
  );

  server.registerTool(
    "exact_get_capabilities",
    {
      description:
        "Return capabilities detected or verified against the configured Exact installation.",
      annotations: READ_ONLY,
    },
    () => safely(async () => capabilities(await service.catalog())),
  );

  server.registerTool(
    "exact_list_entities",
    {
      description:
        "List live metadata entities allowed by the effective read policy.",
      inputSchema: { search: z.string().trim().max(200).optional() },
      annotations: READ_ONLY,
    },
    ({ search }) =>
      safely(async () => {
        const catalog = await service.catalog();
        const needle = search?.toLocaleLowerCase();
        return catalog.entities
          .filter((entity) => policy.canReadEntity(entity))
          .filter(
            (entity) =>
              !needle ||
              entity.name.toLocaleLowerCase().includes(needle) ||
              entity.setName.toLocaleLowerCase().includes(needle),
          )
          .map(({ name, setName, keys, readable, writable }) => ({
            name,
            setName,
            keys,
            readable,
            writable,
          }));
      }),
  );

  server.registerTool(
    "exact_get_entity_schema",
    {
      description:
        "Return keys, properties, types, and discovered support for an allowed entity.",
      inputSchema: { entity: entityNameSchema },
      annotations: READ_ONLY,
    },
    ({ entity }) => safely(() => service.entity(entity)),
  );

  server.registerTool(
    "exact_get_entity",
    {
      description:
        "Read one allowed entity record by a validated simple or composite key.",
      inputSchema: getEntityInput,
      annotations: READ_ONLY,
    },
    ({ entity, key, select }) =>
      safely(() => service.getEntity(entity, key, select)),
  );

  server.registerTool(
    "exact_list_entity_records",
    {
      description:
        "Read allowed entity records using structured filters, validated fields, ordering, limits, and a safe continuation cursor. Raw OData is not accepted.",
      inputSchema: listEntityInput,
      annotations: READ_ONLY,
    },
    ({ entity, select, filter, orderBy, limit, skip, cursor }) =>
      safely(() =>
        service.listEntity(
          entity,
          {
            ...(select ? { select } : {}),
            ...(filter ? { filter } : {}),
            ...(orderBy ? { orderBy } : {}),
            ...(limit ? { limit } : {}),
            ...(skip !== undefined ? { skip } : {}),
          },
          cursor,
        ),
      ),
  );

  server.registerTool(
    "exact_list_actions",
    {
      description:
        "List only public actions discovered in live Exact metadata; internal-looking actions are excluded.",
      inputSchema: { search: z.string().trim().max(200).optional() },
      annotations: READ_ONLY,
    },
    ({ search }) =>
      safely(async () => {
        const needle = search?.toLocaleLowerCase();
        return (await service.catalog()).actions.filter(
          (action) =>
            action.public &&
            (!needle || action.name.toLocaleLowerCase().includes(needle)),
        );
      }),
  );

  server.registerTool(
    "exact_get_action_schema",
    {
      description: "Return the discovered schema for a public Exact action.",
      inputSchema: { action: z.string().trim().min(1).max(200) },
      annotations: READ_ONLY,
    },
    ({ action }) => safely(() => service.action(action)),
  );

  if (
    config.connection.configured &&
    !config.policy.readOnly &&
    config.policy.allowCreate
  ) {
    server.registerTool(
      "exact_create_entity",
      {
        description:
          "Create an explicitly allowed entity and verify it by returned key when possible. Never retries.",
        inputSchema: createEntityInput,
        annotations: WRITE,
      },
      ({ entity, payload }) =>
        safely(() => service.createEntity(entity, payload)),
    );
  }
  if (
    config.connection.configured &&
    !config.policy.readOnly &&
    config.policy.allowUpdate
  ) {
    server.registerTool(
      "exact_update_entity",
      {
        description:
          "Update an explicitly allowed entity by validated key and read it back. Never retries.",
        inputSchema: updateEntityInput,
        annotations: { ...WRITE, idempotentHint: true },
      },
      ({ entity, key, payload }) =>
        safely(() => service.updateEntity(entity, key, payload)),
    );
  }
  if (
    config.connection.configured &&
    !config.policy.readOnly &&
    config.policy.allowDelete
  ) {
    server.registerTool(
      "exact_delete_entity",
      {
        description:
          "Delete an explicitly allowed entity by validated key. Never retries.",
        inputSchema: deleteEntityInput,
        annotations: DELETE,
      },
      ({ entity, key }) => safely(() => service.deleteEntity(entity, key)),
    );
  }
  if (
    config.connection.configured &&
    !config.policy.readOnly &&
    config.policy.allowExecuteAction
  ) {
    server.registerTool(
      "exact_execute_action",
      {
        description:
          "Execute only an explicitly allowlisted public action discovered in metadata. Never retries POST actions.",
        inputSchema: executeActionInput,
        annotations: WRITE,
      },
      ({ action, parameters }) =>
        safely(() => service.executeAction(action, parameters)),
    );
    registerFlowTool(server, service, "synergy_request_flow", "RequestFlow");
    registerFlowTool(server, service, "synergy_document_flow", "DocumentFlow");
    registerFlowTool(server, service, "synergy_resource_flow", "ResourceFlow");
    registerFlowTool(server, service, "synergy_account_flow", "AccountFlow");
  }
}

function registerFlowTool(
  server: McpServer,
  service: ExactService,
  toolName: string,
  prefix: string,
): void {
  server.registerTool(
    toolName,
    {
      description: `Execute an explicitly allowlisted public ${prefix} operation discovered in Synergy metadata.`,
      inputSchema: flowInput,
      annotations: WRITE,
    },
    ({ operation, parameters }) =>
      safely(async () => {
        if (!operation.startsWith(prefix))
          throw new Error(
            `Operation must be a discovered ${prefix} action name`,
          );
        return service.executeAction(operation, parameters);
      }),
  );
}
