/**
 * Demo: Custom MCP Server with Security Boundaries
 *
 * Demonstrates building a custom MCP Server using the TypeScript SDK.
 * Highlights strict schema validation, allowlists, and read-only access.
 */

import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const RELEASE_DATA: Readonly<Record<string, string>> = Object.freeze({
  release_101: "release_101: READY. All required checks passed.",
  release_202: "release_202: HOLD. Performance review is pending.",
});
const ALLOWED_RELEASE_IDS = new Set(Object.keys(RELEASE_DATA));
const ReleaseLookupSchema = z.object({
  id: z.string().regex(/^release_[0-9]{3}$/),
}).strict();

function audit(tool: string, decision: "ALLOW" | "DENY", outcome: string, correlationId: string): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    correlationId,
    tool,
    decision,
    outcome,
  }));
}

function denied() {
  return {
    content: [{ type: "text" as const, text: "Request denied." }],
    isError: true,
  };
}

async function main(): Promise<void> {
  const server = new Server({
    name: "release-readiness-demo",
    version: "1.0.0",
  }, {
    capabilities: { tools: {} },
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
      name: "get_release_status",
      description: "Returns synthetic release-readiness status for an explicitly allowed release ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            pattern: "^release_[0-9]{3}$",
            description: "Synthetic release ID, such as release_101",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
    }],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const correlationId = randomUUID();
    const tool = request.params.name;

    if (tool !== "get_release_status") {
      audit(tool, "DENY", "unknown_tool", correlationId);
      return denied();
    }

    const parsed = ReleaseLookupSchema.safeParse(request.params.arguments);
    if (!parsed.success) {
      audit(tool, "DENY", "malformed_input", correlationId);
      return denied();
    }

    if (!ALLOWED_RELEASE_IDS.has(parsed.data.id)) {
      audit(tool, "DENY", "disallowed_id", correlationId);
      return denied();
    }

    audit(tool, "ALLOW", "success", correlationId);
    return {
      content: [{ type: "text", text: RELEASE_DATA[parsed.data.id] }],
    };
  });

  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
