/**
 * MCP client for DeepWiki: connect to public (mcp.deepwiki.com) or private (mcp.devin.ai) server,
 * list tools, and call read_wiki_structure / read_wiki_contents.
 */

import path from "node:path";

// Use require for MCP SDK; its ESM exports don't resolve under TS moduleResolution Node
const sdkClient = require("@modelcontextprotocol/sdk/client");
const Client = sdkClient.Client;
// Subpath client/streamableHttp fails to resolve in some Node/export setups; use same dir as client
const clientDir = path.dirname(require.resolve("@modelcontextprotocol/sdk/client"));
const StreamableHTTPClientTransport = require(path.join(clientDir, "streamableHttp.js"))
  .StreamableHTTPClientTransport;

function getVersion(): string {
  try {
    const p = path.join(__dirname, "..", "..", "..", "package.json");
    return (require(p) as { version?: string }).version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

const DEEPWIKI_PUBLIC = "https://mcp.deepwiki.com/mcp";
const DEVIN_PRIVATE = "https://mcp.devin.ai/mcp";

export interface McpClientOptions {
  /** public = mcp.deepwiki.com (no auth), private = mcp.devin.ai (DEVIN_API_KEY) */
  server: "public" | "private" | "auto";
  /** API key for private server (default: process.env.DEVIN_API_KEY) */
  apiKey?: string;
}

export interface McpClient {
  callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
  listTools(): Promise<{ name: string; description?: string }[]>;
  close(): Promise<void>;
}

export interface CallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function pickServerAndKey(options: McpClientOptions): { url: string; apiKey?: string } {
  const apiKey = options.apiKey ?? process.env.DEVIN_API_KEY;
  if (options.server === "private" || (options.server === "auto" && apiKey)) {
    return { url: DEVIN_PRIVATE, apiKey };
  }
  return { url: DEEPWIKI_PUBLIC };
}

export async function createMcpClient(options: McpClientOptions): Promise<McpClient> {
  const { url, apiKey } = pickServerAndKey(options);

  const requestInit: RequestInit = {};
  if (apiKey) {
    requestInit.headers = { Authorization: `Bearer ${apiKey}` };
  }

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit,
  });

  const client = new Client({ name: "docdrift", version: getVersion() }, {});

  await client.connect(transport);

  return {
    async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
      const result = await client.callTool({ name, arguments: args });

      const content: Array<{ type: "text"; text: string }> = [];
      for (const item of result.content) {
        if (item.type === "text") {
          content.push({ type: "text", text: item.text });
        }
      }
      return {
        content,
        isError: result.isError,
      };
    },

    async listTools(): Promise<{ name: string; description?: string }[]> {
      const { tools } = await client.listTools();
      return tools.map((t: { name: string; description?: string }) => ({
        name: t.name,
        description: t.description,
      }));
    },

    async close(): Promise<void> {
      try {
        await transport.terminateSession?.();
      } catch {
        // ignore
      }
      await transport.close();
    },
  };
}
