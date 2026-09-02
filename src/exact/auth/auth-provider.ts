import type { AxiosInstance } from "axios";
import type { ExactConfig } from "../../config/types.js";

export type AuthProvider = Readonly<{
  kind: ExactConfig["connection"]["auth"];
  createClient: () => AxiosInstance;
}>;
