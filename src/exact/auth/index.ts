import type { ExactConfig } from "../../config/types.js";
import type { AuthProvider } from "./auth-provider.js";
import { createBasicAuth } from "./basic.js";
import { createNtlmAuth } from "./ntlm.js";
import { createOauthAuth } from "./oauth.js";

export function createAuthProvider(config: ExactConfig): AuthProvider {
  switch (config.connection.auth) {
    case "basic":
      return createBasicAuth(config);
    case "oauth":
      return createOauthAuth(config);
    case "ntlm":
      return createNtlmAuth(config);
  }
}
