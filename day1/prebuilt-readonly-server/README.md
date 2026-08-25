# Pre-built Read-only MCP Server

This supplied server exposes one tool, `read_course_users`, which reads the fixed synthetic `data/users.json` file. It accepts no path or data arguments, has no mutation tool, and does not use credentials, production data, or network access.

## Install and verify

From `day1/prebuilt-readonly-server`:

```bash
npm ci
npm run verify
```

Expected evidence:

```text
PASS discovered only read_course_users
PASS invoked the fixed read-only tool over MCP stdio
PASS synthetic users matched expected values
PASS arbitrary path input was denied
```

Get the absolute project path for client configuration:

```bash
pwd
```

## Claude Code

```bash
claude mcp add --scope local --transport stdio course-readonly-users \
  -- node /ABSOLUTE/PATH/day1/prebuilt-readonly-server/server.mjs
claude mcp list
```

Start Claude Code in the project, use `/mcp` to confirm discovery, and ask it to call `read_course_users`. Inspect the server name and proposed read operation before approving it. Host approval is an additional observation point; the server still exposes only one fixed read-only operation.

## VS Code with GitHub Copilot

Open the companion repository as the workspace. Run **MCP: Open Workspace Folder Configuration** and add this uncommitted `.vscode/mcp.json` entry:

```json
{
  "servers": {
    "course-readonly-users": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/day1/prebuilt-readonly-server/server.mjs"
      ]
    }
  }
}
```

Use the configuration editor's **Start** action, open Copilot Chat in Agent mode, confirm that only `read_course_users` is discovered, and request the synthetic user directory. Review the tool approval prompt when the installed host policy requires confirmation.

## Automated fallback

If client registration or organizational policy blocks MCP use, `npm run verify` provides equivalent discovery and invocation evidence without editing host configuration.

## Cleanup

Run `claude mcp remove --scope local course-readonly-users` for Claude Code. For VS Code, stop the server and remove the temporary `course-readonly-users` entry. Keep `package-lock.json` so installation remains reproducible.
