import { NtlmClient } from "axios-ntlm";
import type { AxiosInstance } from "axios";
import type { ExactConfig } from "../../config/types.js";
import type { AuthProvider } from "./auth-provider.js";

export function createNtlmAuth(config: ExactConfig): AuthProvider {
  return {
    kind: "ntlm",
    createClient: () =>
      NtlmClient({
        username: config.connection.username!,
        password: config.connection.password!,
        domain: config.connection.domain!,
        workstation: "",
      }) as unknown as AxiosInstance,
  };
}
