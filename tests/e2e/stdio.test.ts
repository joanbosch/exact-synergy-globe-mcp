import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("stdio executable", () => {
  it("keeps stdout parseable as MCP while diagnostics use stderr", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "src/index.ts"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "", EXACT_LOG_LEVEL: "info" },
      stderr: "pipe",
    });
    let stderr = "";
    transport.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    const client = new Client({ name: "stdio-test", version: "1.0.0" });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(
        tools.tools.some((tool) => tool.name === "exact_get_server_info"),
      ).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(stderr).toContain("Exact Synergy & Globe MCP started");
    } finally {
      await client.close();
    }
  });

  it("starts when invoked through a symbolic-link bin", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "exact-mcp-"));
    const linkedEntry = join(tempDirectory, "exact-synergy-globe-mcp.ts");
    symlinkSync(resolve("src/index.ts"), linkedEntry);

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", linkedEntry],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "", EXACT_LOG_LEVEL: "silent" },
    });
    const client = new Client({ name: "symlink-stdio-test", version: "1.0.0" });
    try {
      await client.connect(transport);
      expect((await client.listTools()).tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "exact_get_server_info" }),
        ]),
      );
    } finally {
      await client.close();
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
});
