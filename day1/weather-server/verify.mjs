import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const serverEntry = fileURLToPath(new URL("./server.mjs", import.meta.url));
const client = new Client(
  { name: "weather-server-verifier", version: "1.0.0" },
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
  assert.deepEqual(
    tools.map(({ name }) => name).sort(),
    ["get_alerts", "get_forecast"],
  );
  console.log("PASS discovered get_alerts and get_forecast");

  // Sacramento, CA — used as a stable demo coordinate.
  const forecast = await client.callTool({
    name: "get_forecast",
    arguments: { latitude: 38.5816, longitude: -121.4944 },
  });
  assert.equal(forecast.isError, undefined);
  assert.equal(forecast.content[0].type, "text");
  assert.ok(forecast.content[0].text.length > 0);
  console.log("PASS get_forecast returned live NWS data");

  const alerts = await client.callTool({
    name: "get_alerts",
    arguments: { state: "CA" },
  });
  assert.equal(alerts.isError, undefined);
  assert.ok(alerts.content[0].text.length > 0);
  console.log("PASS get_alerts returned live NWS data");
} finally {
  await client.close();
}
