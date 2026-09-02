import axios from "axios";
import type { ExactConfig } from "@config/types.js";
import type { AuthProvider } from "@exact/auth/auth-provider.js";

export function createBasicAuth(config: ExactConfig): AuthProvider {
  return {
    kind: "basic",
    createClient: () =>
      axios.create({
        auth: {
          username: config.connection.username!,
          password: config.connection.password!,
        },
      }),
  };
}
