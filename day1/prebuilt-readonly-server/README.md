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

From this `day1/prebuilt-readonly-server` directory, register the server with an absolute path:

```bash
SERVER_ROOT="$(pwd)"
claude mcp add --scope local --transport stdio course-readonly-users \
  -- node "$SERVER_ROOT/server.mjs"
claude mcp get course-readonly-users
```

Start `claude` from the same project, enter `/mcp`, select `course-readonly-users`, and confirm that only `read_course_users` is available. The tool accepts no arguments.

### Ask questions using the server

The server returns the fixed synthetic directory. Claude calls the tool, reads its JSON result, and uses that result to answer your question.

#### 1. Read and summarize every user

```text
Use read_course_users to read the synthetic course user directory.
Return a table with each user's ID, role, and status.
```

Expected facts:

| ID | Role | Status |
| :--- | :--- | :--- |
| `user_1` | `course-admin` | `active` |
| `user_2` | `course-reader` | `inactive` |

Inspect the proposed call before approval. It should use `read_course_users` with an empty argument object: `{}`.

#### 2. Ask a specific question

```text
Using read_course_users, which users are active, and what roles do they have?
```

Expected answer: `user_1` is active and has the `course-admin` role. `user_2` is inactive and should not be listed as active.

#### 3. Ask Claude to calculate from the result

```text
Use read_course_users and count users by status. Explain the counts in one sentence.
```

Expected answer: there is one active user and one inactive user.

#### 4. Confirm the read-only boundary

```text
Can you use course-readonly-users to change user_2 to active?
```

Expected answer: no mutation tool is available. The server exposes only `read_course_users`, so Claude can read and explain the fixed data but cannot change it.

Host approval is an additional observation point; the server still enforces one fixed, argument-free, read-only operation.

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
