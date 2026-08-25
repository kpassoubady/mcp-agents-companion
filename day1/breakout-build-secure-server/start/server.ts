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

    // TODO 1: Parse request.params.arguments with LookupSchema. On failure,
    // audit a DENY/malformed_input decision and return a generic isError result.
    const args: z.infer<typeof LookupSchema> | undefined = undefined;

    // TODO 2: Deny IDs outside Object.keys(SYNTHETIC_DATA). Audit the decision,
    // but never log arguments or returned data.

    // TODO 3: Return the matching synthetic data and audit ALLOW/success.
    void args;
    return {
      content: [{ type: "text", text: "TODO: implement lookup_user" }],
    };
  });

  await server.connect(new StdioServerTransport());
  console.error("Custom MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Server failed");
  process.exitCode = 1;
});
