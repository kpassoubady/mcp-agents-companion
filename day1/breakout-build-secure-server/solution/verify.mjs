import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const serverEntry = fileURLToPath(new URL("./dist/server.js", import.meta.url));
const client = new Client(
  { name: "secure-lookup-verifier", version: "1.0.0" },
  { capabilities: {} },
);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  cwd: projectRoot,
  stderr: "pipe",
});
let stderr = "";
transport.stderr?.on("data", (chunk) => {
  stderr += chunk.toString();
});

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const textOf = (result) =>
  result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  check(
    tools.length === 1 && tools[0].name === "lookup_user",
    "discovery: expected only lookup_user",
  );

  const allowed = await client.callTool({
    name: "lookup_user",
    arguments: { id: "user_1" },
  });
  check(!allowed.isError, "positive: user_1 returned isError");
  check(
    textOf(allowed) === "Role: Admin, Status: Active",
    "positive: user_1 returned unexpected data",
  );

  const disallowed = await client.callTool({
    name: "lookup_user",
    arguments: { id: "admin_999" },
  });
  check(disallowed.isError === true, "negative: admin_999 was not denied with isError");

  const malformed = await client.callTool({
    name: "lookup_user",
    arguments: { id: "bad/id?token=course-secret" },
  });
  check(malformed.isError === true, "negative: malformed ID was not denied with isError");

  const extraProperty = await client.callTool({
    name: "lookup_user",
    arguments: { id: "user_1", secretMarker: "extra-secret" },
  });
  check(
    extraProperty.isError === true,
    "negative: extra property was not denied with isError",
  );

  const unknown = await client.callTool({
    name: "delete_user",
    arguments: { target: "unknown-secret" },
  });
  check(unknown.isError === true, "negative: unknown tool was not denied with isError");

  const returnedErrors = [disallowed, malformed, extraProperty, unknown]
    .map(textOf)
    .join("\n");
  for (const sensitive of [
    "admin_999",
    "bad/id?token=course-secret",
    "extra-secret",
    "unknown-secret",
  ]) {
    check(!returnedErrors.includes(sensitive), `redaction: returned error exposed ${sensitive}`);
  }
} finally {
  await client.close();
}

const auditEvents = stderr
  .split("\n")
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const expectedAudits = [
  ["lookup_user", "ALLOW", "success"],
  ["lookup_user", "DENY", "id_not_allowed"],
  ["lookup_user", "DENY", "malformed_input"],
  ["lookup_user", "DENY", "malformed_input"],
  ["delete_user", "DENY", "unknown_tool"],
];
check(auditEvents.length === expectedAudits.length, "audit: expected one event per request");
for (const [index, expected] of expectedAudits.entries()) {
  const event = auditEvents.length === expectedAudits.length ? auditEvents[index] : null;
  if (!event) continue;
  check(!Number.isNaN(Date.parse(event.timestamp)), `audit ${index + 1}: invalid timestamp`);
  check(
    typeof event.correlationId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        event.correlationId,
      ),
    `audit ${index + 1}: invalid correlation ID`,
  );
  check(event.tool === expected[0], `audit ${index + 1}: wrong tool`);
  check(event.decision === expected[1], `audit ${index + 1}: wrong decision`);
  check(event.outcome === expected[2], `audit ${index + 1}: wrong outcome`);
  check(
    Object.keys(event).sort().join(",") ===
      "correlationId,decision,outcome,timestamp,tool",
    `audit ${index + 1}: event contains unapproved fields`,
  );
}
check(
  new Set(auditEvents.map((event) => event.correlationId)).size === auditEvents.length,
  "audit: correlation IDs must be unique per request",
);
for (const sensitive of [
  "user_1",
  "admin_999",
  "bad/id?token=course-secret",
  "extra-secret",
  "unknown-secret",
  "Role: Admin",
]) {
  check(!stderr.includes(sensitive), `audit redaction: stderr exposed ${sensitive}`);
}

if (failures.length > 0) {
  console.error("ACCEPTANCE FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("PASS discovered only lookup_user");
  console.log("PASS user_1 returned the expected synthetic record");
  console.log("PASS denied admin_999, malformed syntax, extra properties, and unknown tool");
  console.log("PASS errors and five audit events are redacted");
}
