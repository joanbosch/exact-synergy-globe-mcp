export type ExactApiKind = "auto" | "synergy" | "globe";
export type ExactAuthKind = "ntlm" | "basic" | "oauth";
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export type ExactConfig = Readonly<{
  connection: Readonly<{
    configured: boolean;
    baseUrl?: URL;
    kind: ExactApiKind;
    auth: ExactAuthKind;
    domain?: string;
    dbServer?: string;
    dbName?: string;
    username?: string;
    password?: string;
    accessToken?: string;
    accessTokenType: string;
  }>;
  policy: Readonly<{
    readOnly: boolean;
    allowedEntities?: ReadonlySet<string>;
    allowedActions?: ReadonlySet<string>;
    allowCreate: boolean;
    allowUpdate: boolean;
    allowDelete: boolean;
    allowExecuteAction: boolean;
  }>;
  operation: Readonly<{
    requestTimeoutMs: number;
    maxPageSize: number;
    maxResponseBytes: number;
    maxContinuationPages: number;
    logLevel: LogLevel;
    metadataCachePath?: string;
  }>;
}>;
