import type { ExactAction, ExactEntity } from "../catalog/catalog-types.js";
import type { ExactConfig } from "../config/types.js";

export type WriteOperation = "create" | "update" | "delete" | "executeAction";

export class AccessPolicy {
  public constructor(private readonly config: ExactConfig["policy"]) {}

  public canReadEntity(entity: ExactEntity): boolean {
    return (
      entity.readable &&
      (!this.config.allowedEntities ||
        this.config.allowedEntities.has(entity.name) ||
        this.config.allowedEntities.has(entity.setName))
    );
  }

  public assertEntity(entity: ExactEntity): void {
    if (!this.canReadEntity(entity))
      throw new Error(`Entity '${entity.name}' is not allowed by policy`);
  }

  public assertWrite(
    operation: WriteOperation,
    target: ExactEntity | ExactAction,
  ): void {
    if (this.config.readOnly)
      throw new Error("Writes are disabled because EXACT_READ_ONLY=true");
    const enabled = {
      create: this.config.allowCreate,
      update: this.config.allowUpdate,
      delete: this.config.allowDelete,
      executeAction: this.config.allowExecuteAction,
    }[operation];
    if (!enabled)
      throw new Error(`Operation '${operation}' is disabled by policy`);
    if (operation === "executeAction") {
      const action = target as ExactAction;
      if (!action.public)
        throw new Error(`Action '${action.name}' is internal or not public`);
      if (!this.config.allowedActions?.has(action.name)) {
        throw new Error(`Action '${action.name}' is not explicitly allowed`);
      }
    } else {
      const entity = target as ExactEntity;
      this.assertEntity(entity);
      if (!this.config.allowedEntities) {
        throw new Error(
          "Mutable entity operations require EXACT_ALLOWED_ENTITIES",
        );
      }
    }
  }

  public summary(): Record<string, unknown> {
    return {
      readOnly: this.config.readOnly,
      allowedEntities: this.config.allowedEntities
        ? [...this.config.allowedEntities].sort()
        : "all discovered entities",
      allowedActions: this.config.allowedActions
        ? [...this.config.allowedActions].sort()
        : [],
      create: !this.config.readOnly && this.config.allowCreate,
      update: !this.config.readOnly && this.config.allowUpdate,
      delete: !this.config.readOnly && this.config.allowDelete,
      executeAction: !this.config.readOnly && this.config.allowExecuteAction,
    };
  }
}
