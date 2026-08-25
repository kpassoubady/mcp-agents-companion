# Demo: Configuring a Pre-built Read-only Server

Use the reviewed, student-accessible project at `../mcp-agents-companion/day1/prebuilt-readonly-server`. It pins the MCP SDK and exposes one fixed read-only tool over supplied synthetic data. It has no path input, mutation tool, credentials, production data, or in-class download.

**Duration:** 7 minutes. Demonstrate one client path per cohort; keep the other path available for questions.

## Pre-class preparation

From the instructor repository root, confirm Node.js 22 or later and install exactly what the companion lockfile records:

```bash
node --version
npm --prefix ../mcp-agents-companion/day1/prebuilt-readonly-server ci
npm --prefix ../mcp-agents-companion/day1/prebuilt-readonly-server run verify
```

Expected fallback signals are:

```text
PASS discovered only read_course_users
PASS invoked the fixed read-only tool over MCP stdio
PASS synthetic users matched expected values
PASS arbitrary path input was denied
```

The synthetic result contains `user_1` with active status and `user_2` with inactive status. Do not continue with a live host unless the verifier passes. No network is required after `npm ci`.

## Claude Code path

Use a local-scope entry so the demonstration does not commit configuration. From the instructor repository root, run:

```bash
SERVER_ROOT="$(cd ../mcp-agents-companion/day1/prebuilt-readonly-server && pwd)"
claude mcp add --scope local --transport stdio course-readonly-users \
  -- node "$SERVER_ROOT/server.mjs"
claude mcp get course-readonly-users
```

The client configuration registers how the host starts the server; the server does not register itself. Start Claude Code from the same instructor repository root, open `/mcp`, and confirm that only `read_course_users` is discoverable.

Use this representative prompt:

```text
Use course-readonly-users to call read_course_users and report user_1's status.
```

Point out the proposed tool call before approval. It has no arguments and cannot select another file or operation. Ask learners which boundary is acting, approve once, and show the synthetic result. Host approval is a host control; the server's fixed read-only capability is an independent boundary.

## GitHub Copilot in VS Code path

Open the companion repository root as the VS Code workspace. Run **MCP: Open Workspace Folder Configuration** and use this temporary `.vscode/mcp.json` entry:

```json
{
  "servers": {
    "course-readonly-users": {
      "type": "stdio",
      "command": "node",
      "args": [
        "${workspaceFolder}/day1/prebuilt-readonly-server/server.mjs"
      ]
    }
  }
}
```

Use the configuration editor's **Start** action, open Copilot Chat in Agent mode, and confirm that only `read_course_users` is discovered. Use the representative prompt above. Show the proposed fixed read operation, the host confirmation control when policy requires it, and the exact synthetic result. State what is visible rather than claiming that every host always prompts.

The workspace file registers the server command with the VS Code MCP client. The server defines its one tool and does not write client configuration.

## Offline fallback

If host login, policy, discovery, or approval prevents the live path, spend no more than one minute troubleshooting. Run:

```bash
npm --prefix ../mcp-agents-companion/day1/prebuilt-readonly-server run verify
```

Narrate discovery, invocation, the exact synthetic result, and the rejected path argument. This fallback proves the MCP interaction but does not simulate a model proposal or host approval interface.

## AM/PM cleanup and reset

After each cohort:

1. Run `claude mcp remove --scope local course-readonly-users` and confirm the entry is absent.
2. For VS Code, stop the server and remove its temporary entry. Do not commit `.vscode/mcp.json`.
3. Close host sessions and rerun the verifier before the next cohort.
4. Confirm `data/users.json` still contains only the two documented synthetic records.

## Debrief

The host's MCP client registers the connection command and discovers capabilities. The supplied server exposes one fixed read-only tool. The model may propose a call, the host applies its approval policy, and the server still restricts execution to the supplied synthetic operation.
