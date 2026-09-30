# Starter: Build and Secure a Custom MCP Server

This project is the incomplete learner version of the secure-server breakout. Complete a bounded, read-only MCP tool named `lookup_user`, verify its security controls, and then connect it to an MCP client.

For the full 45-minute pair exercise, prompts, timing, and architecture activity, see [the parent lab guide](../README.md).

## The problem

The server exposes synthetic user records over MCP `stdio`. A valid implementation must return an approved record while preventing malformed, unauthorized, or unknown requests from exposing data.

The completed server must:

- Discover only `lookup_user`.
- Accept exactly one argument: an identifier matching `^[a-z]+_[0-9]+$`.
- Return only records already present in `SYNTHETIC_DATA`.
- Reject malformed input, extra properties, disallowed identifiers, and unknown tools with generic errors.
- Write one redacted audit event to `stderr` for every tool request.
- Never log request arguments, identifiers, validation details, or returned records.

Do not add shell execution, filesystem access, network access, credentials, production data, dependencies, or additional tools.

## Files

| File | Purpose | May you edit it? |
| :--- | :--- | :--- |
| `server.ts` | Incomplete MCP server with three bounded TODOs | Yes |
| `verify.mjs` | Acceptance client and security contract | No |
| `package.json` | Exact scripts and dependency versions | No |
| `package-lock.json` | Reproducible dependency lock | No |
| `tsconfig.json` | TypeScript build configuration | No |

## Install and establish the red state

Run these commands from this `start/` directory:

```bash
node --version
npm ci
npm run build
npm run verify
```

Node.js must be version 22 or later. The build should succeed, but the untouched starter should report:

```text
ACCEPTANCE FAILED
- positive: user_1 returned unexpected data
- negative: admin_999 was not denied with isError
- negative: malformed ID was not denied with isError
- negative: extra property was not denied with isError
- audit: expected one event per request
```

This is the intended red state, not an environment failure. Do not change or weaken `verify.mjs` to make it pass.

## Complete the server

Work only in `server.ts`.

1. **TODO 1 — strict parsing:** Parse the tool arguments with the existing strict `LookupSchema`. On failure, audit `DENY` with `malformed_input` and return a generic result with `isError: true`.
2. **TODO 2 — identifier allowlist:** Permit only identifiers that are own properties of `SYNTHETIC_DATA`. Deny all other syntactically valid identifiers without echoing them.
3. **TODO 3 — allowed result:** Return the matching synthetic record and audit `ALLOW` with `success`.

Preserve the existing one-tool discovery contract, Zod schema, `stdio` transport, audit-event fields, and error boundaries.

## Verify your implementation

```bash
npm run verify
```

A complete implementation prints:

```text
PASS discovered only lookup_user
PASS user_1 returned the expected synthetic record
PASS denied admin_999, malformed syntax, extra properties, and unknown tool
PASS errors and five audit events are redacted
```

The verifier builds the project, starts `dist/server.js` as a real MCP server, discovers its tools, invokes the allow and deny paths, and validates the captured `stderr` audit events.

## Connect your completed server to Claude Code

Run this only after verification passes:

```bash
START_ROOT="$(pwd)"
claude mcp add --scope local --transport stdio course-secure-lookup \
  -- node "$START_ROOT/dist/server.js"
claude mcp get course-secure-lookup
```

Start `claude` from this directory, enter `/mcp`, select `course-secure-lookup`, and confirm that only `lookup_user` is available.

Prove the allow path:

```text
Use lookup_user to look up user_1. Show the tool name and arguments for
approval, then summarize the result.
```

Expected result: `Role: Admin, Status: Active`.

Prove the deny path:

```text
Use lookup_user to look up admin_999. Show the tool name and arguments for
approval, then report the server response.
```

The host may approve the proposed call, but the server must still deny the identifier. Host approval does not replace server-side validation or authorization.

## Run directly

```bash
npm run build
npm start
```

The server communicates over MCP `stdio` and expects an MCP client. An apparently idle terminal is normal; do not type requests into it manually. Press `Ctrl+C` to stop it.

## Cleanup

```bash
claude mcp remove --scope local course-secure-lookup
```

Do not commit local MCP client configuration.
