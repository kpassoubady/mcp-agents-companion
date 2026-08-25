# Lab 1.5: Build and Secure a Custom MCP Server

**Time:** 45 minutes<br>
**Stack:** Node.js 22 or later, TypeScript `5.9.3`, MCP SDK `1.30.0`, Zod `3.25.76`

## Goal and safety boundary

Complete a bounded, read-only `lookup_user` tool over stdio. The tool may return only supplied synthetic records, must strictly validate input, must enforce its server-side identifier allowlist, and must emit redacted audit events. Do not add shell execution, arbitrary filesystem or URL access, production data, credentials, or personal data.

Work in pairs. The **driver** types and runs commands; the **navigator** reads the contract, predicts results, and checks security boundaries. Switch roles after Phase 2. Before each first test run, both people privately write down which checks they expect to pass or fail, then compare predictions before viewing output.

## One working directory

Open a terminal at the lab root and keep every command relative to it:

```bash
cd day1/breakout-build-secure-server
pwd
node --version
```

The printed path must end in `day1/breakout-build-secure-server`, and Node must be 22 or later. Do not edit `start/verify.mjs`, package files, lockfiles, or `tsconfig.json`. Learner changes belong only in `start/server.ts`.

## Phase 1: Connect the pre-built server (5 minutes)

The student-accessible Part 1 project is `../prebuilt-readonly-server`. It exposes only `read_course_users`, a fixed read-only operation over synthetic `data/users.json`.

```bash
npm --prefix ../prebuilt-readonly-server ci
npm --prefix ../prebuilt-readonly-server run verify
PREBUILT_ROOT="$(cd ../prebuilt-readonly-server && pwd)"
printf '%s\n' "$PREBUILT_ROOT"
```

Select one client path. Inspect any host trust or tool approval prompt before approving: verify the server name, `node` command, and fixed read operation. Record that observation. Host approval adds defense in depth. The server still enforces authorization.

### Claude Code registration

```bash
claude mcp add --scope local --transport stdio course-readonly-users \
  -- node "$PREBUILT_ROOT/server.mjs"
claude mcp list
```

Start Claude Code from this lab root, use `/mcp` to inspect tools, and ask: `Call read_course_users and report user_1's status.`

### VS Code with GitHub Copilot registration

Open the companion repository in VS Code. Run **MCP: Open Workspace Folder Configuration** and place this in `.vscode/mcp.json`, replacing `/ABSOLUTE/PREBUILT_ROOT` with the exact path printed above:

```json
{
  "servers": {
    "course-readonly-users": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/ABSOLUTE/PREBUILT_ROOT/server.mjs"
      ]
    }
  }
}
```

Use the configuration editor's **Start** action. In Copilot Chat Agent mode, confirm that only `read_course_users` is discovered and ask the same synthetic user question.

**Fallback trigger:** if registration, policy, or approval blocks the client after two minutes, use the already-run `npm --prefix ../prebuilt-readonly-server run verify` output as equivalent discovery and invocation evidence. Do not spend coding time debugging the host.

**Human checkpoint:** show your partner the single discovered read tool, successful synthetic response, rejected path argument, and approval observation before continuing.

## Phase 2: Complete the handler (15 minutes)

Install, build, and establish the intended red state:

```bash
npm --prefix start ci
npm --prefix start run build
npm --prefix start run verify
```

The server must build and start, while acceptance fails because the three bounded TODOs are incomplete. Privately predict the positive and negative results before running verification. Read `start/server.ts` and `start/verify.mjs`; do not change the verifier.

### Bounded coding-assistant prompt

```text
We are in day1/breakout-build-secure-server using TypeScript 5.9.3,
@modelcontextprotocol/sdk 1.30.0, and Zod 3.25.76. Read start/server.ts and
start/verify.mjs. Propose a minimal change for TODO 1 and TODO 3 only: strictly
parse arguments with the existing LookupSchema, return a generic isError result
when parsing fails, and return the matching synthetic record on success. Preserve
one discovered tool, stdio transport, exact dependencies, and all tests. Do not
edit tests, use a shell, access files or URLs, or add dependencies. Explain the
patch before applying it. Then run npm --prefix start run verify and quote the
remaining failures exactly.
```

Driver applies only the reviewed TODO changes. Navigator checks that `.strict()` and the ID regex still apply and that errors do not echo arguments.

**Human checkpoint:** inspect the diff together. Reject changes outside `start/server.ts`, test weakening, broad `any` types, argument logging, or new capabilities.

## Phase 3: Add the security boundary (8 minutes)

Switch driver and navigator. Implement the remaining TODO so only IDs present in `SYNTHETIC_DATA` are allowed. Every request must produce one audit event with timestamp, a generated per-request correlation ID, tool, decision, and outcome. Exclude arguments and returned data.

```text
We are in day1/breakout-build-secure-server using TypeScript 5.9.3 and
@modelcontextprotocol/sdk 1.30.0. Read start/server.ts and start/verify.mjs.
Implement only the remaining allowlist and audit TODO behavior. Use
Object.hasOwn(SYNTHETIC_DATA, parsed.data.id). Audit success, unknown tool,
malformed input, and disallowed ID with timestamp, a fresh random UUID, tool,
decision, and outcome. Never log arguments, validation details, IDs, or returned
data. Return generic isError payloads for denials. Do not edit tests or package
files and do not add capabilities. Explain the security boundary before editing.
```

```bash
npm --prefix start run build
npm --prefix start run verify
```

**Human checkpoint:** compare the implementation to `start/verify.mjs`. Confirm `admin_999` has valid syntax but fails the allowlist, malformed syntax fails Zod, extra properties fail `.strict()`, and all errors are generic.

## Phase 4: Verify, register, and repair (10 minutes)

The automated client starts the real built stdio server and checks discovery, one positive case, four denials, response redaction, and five audit events:

```bash
npm --prefix start run verify
```

Expected green evidence:

```text
PASS discovered only lookup_user
PASS user_1 returned the expected synthetic record
PASS denied admin_999, malformed syntax, extra properties, and unknown tool
PASS errors and five audit events are redacted
```

If your first implementation still has the original TODO behavior, use this repair prompt with the exact failure output (do not summarize it):

```text
Read start/server.ts and start/verify.mjs. Do not edit the verifier or weaken its
checks. My exact output is:
ACCEPTANCE FAILED
- positive: user_1 returned unexpected data
- negative: admin_999 was not denied with isError
- negative: malformed ID was not denied with isError
- negative: extra property was not denied with isError
- audit: expected one event per request
Identify the smallest root-cause patch limited to the bounded TODOs. Preserve
TypeScript 5.9.3, @modelcontextprotocol/sdk 1.30.0, strict Zod validation, generic
errors, the allowlist, and redacted per-request audits. Explain first, then patch,
run npm --prefix start run verify, and quote the complete output.
```

Register the built custom server in the same selected client, or retain automated fallback evidence:

```bash
LAB_ROOT="$(pwd)"
claude mcp add --scope local --transport stdio course-secure-lookup \
  -- node "$LAB_ROOT/start/dist/server.js"
claude mcp list
```

For VS Code, add this sibling entry to `.vscode/mcp.json` with the exact `LAB_ROOT` path:

```json
"course-secure-lookup": {
  "type": "stdio",
  "command": "node",
  "args": ["/ABSOLUTE/LAB_ROOT/start/dist/server.js"]
}
```

Ask for `user_1`, then `admin_999`. Inspect the host approval and server stderr/audit output. If the client path fails, the passing verifier is the automated fallback; it is not permission to weaken any check.

## Phase 5: Review, map, and share out (7 minutes)

### Completion levels

- **Basic:** server builds; only `lookup_user` is discovered; `user_1` returns the exact synthetic record.
- **Intermediate (definition of done):** Basic plus `admin_999`, malformed ID syntax, and extra properties are denied with `isError`; returned errors expose no sensitive arguments; success, unknown tool, malformed input, and disallowed ID each have a redacted timestamped, per-request-correlated audit event; selected-client or fallback evidence is captured.
- **Stretch:** add a short threat note explaining why host approval cannot replace server validation and where production authorization would be added. Do not add code or capabilities.

### Architecture-map annotation

On paper or a shared whiteboard, draw and label:

```text
User -> MCP Host/Client -> stdio -> lookup_user MCP Server -> SYNTHETIC_DATA
```

Annotate host approval at the host/client boundary; strict schema and identifier allowlist at the server boundary; and redacted audit at the server's stderr boundary. Then add four enterprise callouts without implementing them: delegated identity before the gateway, an approved MCP-aware gateway before the server, workload isolation around the server, and centralized audit collection after it.

### Evidence-based share-out

Each pair gets 60 seconds. Show the four `PASS` lines (or equivalent selected-client evidence), one redacted audit structure, and the annotated architecture map. State one private prediction that changed after evidence and answer: **Which control still denies `admin_999` if a user approves the host's tool call, and why?**

## Cleanup

From the lab root:

```bash
claude mcp remove --scope local course-secure-lookup
claude mcp remove --scope local course-readonly-users
```

If you used VS Code, stop both servers and remove both entries from `.vscode/mcp.json`; delete the local file if empty. Do not commit client configuration. Keep lockfiles so installation remains reproducible.
