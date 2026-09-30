# Solution: Run and Explore the Secure MCP Server

This directory contains the completed solution for the secure-server breakout. Use it when class time does not permit implementing the starter, or after the exercise to compare behavior and review the security design.

For the complete breakout scenario and architecture activity, see [the parent lab guide](../README.md). The learner implementation is in [`../start/`](../start/).

## The problem this solution addresses

An MCP server exposes a synthetic user lookup to an AI host. A host approval prompt alone is not authorization: an approved call can still contain malformed input or request an identifier outside the server's permitted data set.

This solution applies defense in depth:

1. The MCP client discovers only `lookup_user`.
2. A strict Zod schema accepts only an `id` matching `^[a-z]+_[0-9]+$` and rejects extra properties.
3. An identifier allowlist permits only own properties of `SYNTHETIC_DATA`.
4. Denials return generic errors without reflecting sensitive arguments.
5. Every request emits a redacted audit event with a timestamp, unique correlation ID, tool, decision, and outcome.

The project uses synthetic data only. It has no shell, filesystem, network, credential, or production-data access.

## Quick path: install and verify

Run these commands from this `solution/` directory:

```bash
node --version
npm ci
npm run verify
```

Node.js must be version 22 or later. Successful verification prints:

```text
PASS discovered only lookup_user
PASS user_1 returned the expected synthetic record
PASS denied admin_999, malformed syntax, extra properties, and unknown tool
PASS errors and five audit events are redacted
```

The verifier compiles `server.ts`, starts `dist/server.js` over `stdio`, acts as an MCP client, invokes five requests, and checks both responses and captured audit events.

## Understand the implementation

Open `server.ts` and follow the request path:

1. `ListToolsRequestSchema` publishes one tool and a JSON Schema with `additionalProperties: false`.
2. `CallToolRequestSchema` rejects unknown tool names.
3. `LookupSchema.safeParse(...)` rejects malformed IDs and extra properties.
4. `Object.hasOwn(SYNTHETIC_DATA, parsed.data.id)` enforces the identifier allowlist.
5. Allowed calls return the matching synthetic record.
6. `audit(...)` writes metadata-only JSON to `stderr`; it never includes IDs, arguments, or returned data.

The supplied records are:

| Identifier | Allowed result |
| :--- | :--- |
| `user_1` | `Role: Admin, Status: Active` |
| `user_2` | `Role: User, Status: Inactive` |

A syntactically valid identifier such as `admin_999` is still denied because it is absent from the allowlist.

## Connect the solution to Claude Code

`npm run verify` already builds the server. Register the generated JavaScript entry point:

```bash
SOLUTION_ROOT="$(pwd)"
claude mcp add --scope local --transport stdio course-secure-lookup-solution \
  -- node "$SOLUTION_ROOT/dist/server.js"
claude mcp get course-secure-lookup-solution
```

Start `claude` from this directory. Enter `/mcp`, select `course-secure-lookup-solution`, and confirm that only `lookup_user` is available.

## Use the solution

### 1. Prove the allow path

Ask Claude:

```text
Use lookup_user to look up user_1. Show the tool name and arguments for
approval, then summarize the result.
```

Inspect the proposed call before approval:

```json
{"id":"user_1"}
```

Expected server result:

```text
Role: Admin, Status: Active
```

The matching audit event records `decision=ALLOW` and `outcome=success` without recording the identifier or result.

Try the second allowed record:

```text
Use lookup_user to look up user_2 and summarize the result.
```

Expected result: `Role: User, Status: Inactive`.

### 2. Prove the deny path

Ask Claude:

```text
Use lookup_user to look up admin_999. Show the tool name and arguments for
approval, then report the server response.
```

The identifier matches the required syntax, so schema validation succeeds. Even if the host approves the call, the server's allowlist rejects it and returns a generic `Access denied.` error. The audit event records `decision=DENY` and `outcome=id_not_allowed` without recording `admin_999`.

This distinction is the main lesson: host approval controls whether a call may be attempted, while server validation and authorization control whether it may succeed.

## Connect with VS Code and GitHub Copilot

Open the companion repository as the VS Code workspace. Run **MCP: Open Workspace Folder Configuration** and add a server entry using the absolute path printed by `printf '%s\n' "$SOLUTION_ROOT"`:

```json
{
  "servers": {
    "course-secure-lookup-solution": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/ABSOLUTE/SOLUTION_ROOT/dist/server.js"
      ]
    }
  }
}
```

Use the configuration editor's **Start** action. In Copilot Chat Agent mode, confirm that only `lookup_user` is enabled, then use the same allow and deny prompts.

## Run directly

```bash
npm run build
npm start
```

The server communicates over MCP `stdio` and expects a client. An apparently idle terminal is normal; do not type requests into it manually. Press `Ctrl+C` to stop it.

## Audit evidence

Some hosts capture MCP server `stderr` in their own logs rather than displaying it in chat. If audit events are not visible in your client, run:

```bash
npm run verify
```

The verifier captures `stderr` and proves that all five events have exactly these fields:

```text
timestamp, correlationId, tool, decision, outcome
```

It also proves that identifiers, malformed inputs, extra-property values, unknown-tool arguments, and returned records are absent from the audit stream.

## Cleanup

For Claude Code:

```bash
claude mcp remove --scope local course-secure-lookup-solution
```

For VS Code, stop the server and remove the temporary entry from `.vscode/mcp.json`. Do not commit local MCP client configuration.
