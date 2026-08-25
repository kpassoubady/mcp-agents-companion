import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const TOOL_NAME = "read_course_users";
const dataFile = fileURLToPath(new URL("./data/users.json", import.meta.url));
const server = new Server(
  { name: "course-prebuilt-readonly-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: TOOL_NAME,
    description: "Reads the fixed synthetic course user directory.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== TOOL_NAME || Object.keys(request.params.arguments ?? {}).length > 0) {
    return {
      content: [{ type: "text", text: "Request denied." }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: await readFile(dataFile, "utf8") }],
  };
});

await server.connect(new StdioServerTransport());
