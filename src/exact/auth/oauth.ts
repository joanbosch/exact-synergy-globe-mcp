import axios from "axios";
import type { ExactConfig } from "@config/types.js";
import type { AuthProvider } from "@exact/auth/auth-provider.js";

export function createOauthAuth(config: ExactConfig): AuthProvider {
  return {
    kind: "oauth",
    createClient: () =>
      axios.create({
        headers: {
          Authorization: `${config.connection.accessTokenType} ${config.connection.accessToken!}`,
        },
      }),
  };
}
