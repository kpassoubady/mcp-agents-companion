# Demo: Release-readiness MCP Server

This local TypeScript server demonstrates security boundaries with one read-only tool over synthetic release data. It uses stdio, invokes no shell, accepts no arbitrary path or URL, and needs no credentials or network access after installation.

**Duration:** 8 minutes.

## Requirements and pre-class setup

- Node.js 22 or later
- npm with access to the pre-populated dependency cache during pre-class preparation

From the instructor repository root:

```bash
npm --prefix day1/demos/02-custom-server ci
npm --prefix day1/demos/02-custom-server run verify
```

The exact dependency versions are recorded in `package.json` and `package-lock.json`. Run `npm ci` before both cohorts. The deterministic verifier builds the project, starts the built server over stdio with the SDK client transport, discovers its tool, performs an allowed call, and checks disallowed-ID, malformed-input, and unknown-tool calls.

## Instructor run of show

1. Run `npm --prefix day1/demos/02-custom-server run verify` from the repository root.
2. Show discovery of the single `get_release_status` tool and `additionalProperties=false`.
3. Show the allowed input `{"id":"release_101"}` and result `release_101: READY. All required checks passed.`
4. Compare the generic `Request denied.` response for `release_999`, an extra property, and the unknown `delete_release` tool.
5. Point out the four timestamped audit events summarized by the verifier. Each event has a generated correlation ID, tool name, decision, and outcome; arguments and release IDs are omitted.
6. Debrief where each control acts: the strict Zod object rejects malformed input, the explicit allowlist rejects an unapproved identifier, and server-side enforcement does not depend on model instructions or host approval.

The server writes only MCP protocol frames to stdout. Audit events go to server stderr; teaching labels and the final summary go to verifier stdout.

## Optional client registration

The verifier is the reliable classroom path. To inspect the server through Claude Code from the repository root, use a project-scoped client entry:

```bash
claude mcp add --transport stdio --scope project release-readiness-demo -- npm --prefix day1/demos/02-custom-server run start
claude mcp get release-readiness-demo
```

Claude Code stores that project entry in `<repo-root>/.mcp.json`. The client configuration registers how to start the server. The server does not register itself; it exposes the tool that the connected client discovers.

For VS Code, place this entry under `servers` in `<repo-root>/.vscode/mcp.json`, then use **MCP: List Servers** to start it:

```json
{
  "servers": {
    "release-readiness-demo": {
      "type": "stdio",
      "command": "npm",
      "args": [
        "--prefix",
        "${workspaceFolder}/day1/demos/02-custom-server",
        "run",
        "start"
      ]
    }
  }
}
```

Use the prompt `Check release readiness for release_101 with get_release_status.` Enable only this demo tool and observe the proposed input before approval when the installed host policy presents a confirmation control.

## No-network fallback

If a host cannot connect or organizational policy disables MCP, immediately rerun:

```bash
npm --prefix day1/demos/02-custom-server run verify
```

This uses installed local dependencies and provides equivalent discovery, allowed-call, denied-call, and audit evidence without network access. It does not simulate model selection or host approval UI.

## Cleanup

Remove an optional Claude Code entry with `claude mcp remove --scope project release-readiness-demo`. Stop and remove the temporary VS Code entry if used. The verifier closes its stdio child automatically and does not modify synthetic data, so it can be rerun unchanged for the PM cohort.
