import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const TOOL_NAME = "lookup_user";
const SYNTHETIC_DATA: Record<string, string> = {
  user_1: "Role: Admin, Status: Active",
  user_2: "Role: User, Status: Inactive",
};
const LookupSchema = z
  .object({
    id: z.string().regex(/^[a-z]+_[0-9]+$/),
  })
  .strict();

type Decision = "ALLOW" | "DENY";

function audit(tool: string, decision: Decision, outcome: string): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      tool,
      decision,
      outcome,
    }),
  );
}

async function main(): Promise<void> {
  const server = new Server(
    { name: "breakout-secure-server", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: TOOL_NAME,
        description: "Looks up synthetic user information safely.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[a-z]+_[0-9]+$" },
          },
          required: ["id"],
          additionalProperties: false,
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== TOOL_NAME) {
      audit(request.params.name, "DENY", "unknown_tool");
      return {
        content: [{ type: "text", text: "Request denied." }],
        isError: true,
      };
    }

    const parsed = LookupSchema.safeParse(request.params.arguments);
    if (!parsed.success) {
      audit(TOOL_NAME, "DENY", "malformed_input");
      return {
        content: [{ type: "text", text: "Request denied." }],
        isError: true,
      };
    }

    if (!Object.hasOwn(SYNTHETIC_DATA, parsed.data.id)) {
      audit(TOOL_NAME, "DENY", "id_not_allowed");
      return {
        content: [{ type: "text", text: "Access denied." }],
        isError: true,
      };
    }

    audit(TOOL_NAME, "ALLOW", "success");
    return {
      content: [{ type: "text", text: SYNTHETIC_DATA[parsed.data.id] }],
    };
  });

  await server.connect(new StdioServerTransport());
  console.error("Custom MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Server failed");
  process.exitCode = 1;
});
