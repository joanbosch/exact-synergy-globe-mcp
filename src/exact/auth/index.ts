import type { ExactConfig } from "@config/types.js";
import type { AuthProvider } from "@exact/auth/auth-provider.js";
import { createBasicAuth } from "@exact/auth/basic.js";
import { createNtlmAuth } from "@exact/auth/ntlm.js";
import { createOauthAuth } from "@exact/auth/oauth.js";

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
