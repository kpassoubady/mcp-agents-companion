import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const serverEntry = fileURLToPath(new URL("./server.mjs", import.meta.url));
const expected = {
  users: [
    { id: "user_1", role: "course-admin", status: "active" },
    { id: "user_2", role: "course-reader", status: "inactive" },
  ],
};
const client = new Client(
  { name: "prebuilt-readonly-verifier", version: "1.0.0" },
  { capabilities: {} },
);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  cwd: projectRoot,
  stderr: "pipe",
});

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name), ["read_course_users"]);
  assert.equal(tools[0].inputSchema.additionalProperties, false);

  const result = await client.callTool({
    name: "read_course_users",
    arguments: {},
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, "text");
  assert.deepEqual(JSON.parse(result.content[0].text), expected);

  const denied = await client.callTool({
    name: "read_course_users",
    arguments: { path: "/tmp/not-allowed" },
  });
  assert.equal(denied.isError, true);

  console.log("PASS discovered only read_course_users");
  console.log("PASS invoked the fixed read-only tool over MCP stdio");
  console.log("PASS synthetic users matched expected values");
  console.log("PASS arbitrary path input was denied");
} finally {
  await client.close();
}
