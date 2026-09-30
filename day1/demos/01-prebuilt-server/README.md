# Demo: Connecting Claude to a Real MCP Server

Connect a host (Claude Code or VS Code/Copilot) to `../mcp-agents-companion/day1/weather-server` — a real MCP server over the free, keyless [National Weather Service API](https://www.weather.gov/documentation/services-web-api). No API key, no synthetic data. Ask a real question and get a real answer.

**Duration:** 7 minutes. Demonstrate one client path per cohort; keep the other path available for questions.

## Pre-class preparation

From the instructor repository root, confirm Node.js 22 or later and install the companion server's dependencies:

```bash
node --version
npm --prefix ../mcp-agents-companion/day1/weather-server ci
npm --prefix ../mcp-agents-companion/day1/weather-server run verify
```

Expected output:

```text
PASS discovered get_alerts and get_forecast
PASS get_forecast returned live NWS data
PASS get_alerts returned live NWS data
```

This requires network access to `api.weather.gov`. Do not continue with a live host unless the verifier passes.

## Claude Code path

Use a local-scope entry so the demonstration does not commit configuration. From the instructor repository root, run:

```bash
SERVER_ROOT="$(cd ../mcp-agents-companion/day1/weather-server && pwd)"
claude mcp add --scope local --transport stdio weather \
  -- node "$SERVER_ROOT/server.mjs"
claude mcp get weather
```

Start Claude Code from the same instructor repository root, open `/mcp`, and confirm that `get_forecast` and `get_alerts` are discoverable.

Ask it directly, live, in front of the class:

```text
What's the weather forecast for Sacramento, CA? (latitude 38.5816, longitude -121.4944)
```

```text
Are there any active weather alerts in Texas?
```

Point out the proposed tool call before approving it — the exact latitude/longitude or state code the model chose, and which tool it picked. Approve it and read the real forecast or alert back to the class. Then ask learners for their own city's coordinates and run it again live.

## GitHub Copilot in VS Code path

Open the companion repository root as the VS Code workspace. Run **MCP: Open Workspace Folder Configuration** and use this temporary `.vscode/mcp.json` entry:

```json
{
  "servers": {
    "weather": {
      "type": "stdio",
      "command": "node",
      "args": [
        "${workspaceFolder}/day1/weather-server/server.mjs"
      ]
    }
  }
}
```

Use the configuration editor's **Start** action, open Copilot Chat in Agent mode, and confirm that `get_forecast` and `get_alerts` are discovered. Use the same prompts as above. Show the proposed tool call, the host confirmation control when policy requires it, and the live result.

## Offline fallback

If host login, policy, discovery, or approval prevents the live path, spend no more than one minute troubleshooting. Run:

```bash
npm --prefix ../mcp-agents-companion/day1/weather-server run verify
```

Narrate discovery and invocation as the verifier output scrolls — it calls the same live API the host would have called. This fallback proves the MCP interaction but does not simulate a model proposal or host approval interface.

## AM/PM cleanup and reset

After each cohort:

1. Run `claude mcp remove --scope local weather` and confirm the entry is absent.
2. For VS Code, stop the server and remove its temporary entry. Do not commit `.vscode/mcp.json`.
3. Close host sessions before the next cohort.

## Debrief

The host's MCP client registers the connection command and discovers capabilities. The server exposes two real, read-only tools backed by a live public API — nothing synthetic, nothing local-only. The model proposes a call with arguments it inferred from the question, the host applies its approval policy, and the server executes exactly that call against `api.weather.gov`.
