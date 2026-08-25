import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const cwd = fileURLToPath(new URL(".", import.meta.url));
const auditLines: string[] = [];
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["server.js"],
  cwd,
  stderr: "pipe",
});
const client = new Client({ name: "release-readiness-verifier", version: "1.0.0" });

function responseText(result: unknown): string {
  assert(result && typeof result === "object", "expected a tool result");
  const content = (result as { content?: unknown }).content;
  assert(Array.isArray(content), "expected result content");
  const item: unknown = content[0];
  assert(item && typeof item === "object" && "type" in item && item.type === "text", "expected one text result");
  assert("text" in item && typeof item.text === "string", "expected text content");
  return item.text;
}

async function main(): Promise<void> {
  await client.connect(transport);
  transport.stderr?.on("data", (chunk: Buffer) => {
    auditLines.push(...chunk.toString().split("\n").filter((line) => line.startsWith("{")));
  });

  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name), ["get_release_status"]);
  assert.equal(listed.tools[0]?.inputSchema.additionalProperties, false);
  console.log("DISCOVERY tool=get_release_status additionalProperties=false");

  const allowed = await client.callTool({
    name: "get_release_status",
    arguments: { id: "release_101" },
  });
  assert.equal(allowed.isError, undefined);
  assert.equal(responseText(allowed), "release_101: READY. All required checks passed.");
  console.log("ALLOW input={\"id\":\"release_101\"} result=READY");

  const disallowed = await client.callTool({
    name: "get_release_status",
    arguments: { id: "release_999" },
  });
  assert.equal(disallowed.isError, true);
  assert.equal(responseText(disallowed), "Request denied.");
  console.log("DENY input={\"id\":\"release_999\"} result=Request denied.");

  const malformed = await client.callTool({
    name: "get_release_status",
    arguments: { id: "release_101", extra: "not allowed" },
  });
  assert.equal(malformed.isError, true);
  assert.equal(responseText(malformed), "Request denied.");
  console.log("DENY malformed=extra-property result=Request denied.");

  const unknown = await client.callTool({ name: "delete_release", arguments: {} });
  assert.equal(unknown.isError, true);
  assert.equal(responseText(unknown), "Request denied.");
  console.log("DENY unknown-tool=delete_release result=Request denied.");

  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(auditLines.length, 4, "expected one audit event for every call");
  const events = auditLines.map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.deepEqual(events.map((event) => event.outcome), [
    "success",
    "disallowed_id",
    "malformed_input",
    "unknown_tool",
  ]);
  assert(events.every((event) => typeof event.timestamp === "string"));
  assert(events.every((event) => typeof event.correlationId === "string"));
  assert.equal(new Set(events.map((event) => event.correlationId)).size, 4);
  assert(events.every((event) => !("arguments" in event) && !("id" in event)));
  console.log("AUDIT events=4 outcomes=success,disallowed_id,malformed_input,unknown_tool arguments=omitted");
  console.log("VERIFY PASS");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await transport.close();
  });
