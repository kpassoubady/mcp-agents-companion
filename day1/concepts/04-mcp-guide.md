# MCP (Model Context Protocol) — Practical Guide

A hands-on reference for where each client stores its server config and how to add/inspect/debug
servers in Claude Code CLI, VS Code, IntelliJ, and a few others. For the core architecture
concepts (host/client/server/model, transports) see [01-mcp-architecture.md](01-mcp-architecture.md);
for the scope-precedence trap, connection-status vs. functional-status, and the OAuth diagnostic
recipe, see [03-mcp-config-troubleshooting.md](03-mcp-config-troubleshooting.md). This guide covers
what those two don't: exact config file locations across hosts, host-by-host hands-on steps, and
two worked case studies. Identifiers such as hostnames and usernames are generic placeholders
throughout.

---

## 1. Config file locations, by host

### Claude Code CLI — three scopes, one command family

Claude Code has **three storage scopes**, all managed through `claude mcp add/list/get/remove`.
Do **not** hand-edit `.mcp.json` files and expect them to "just work" — always verify with
`claude mcp get <name>` because a higher-precedence scope can silently shadow your edit (see
[03-mcp-config-troubleshooting.md](03-mcp-config-troubleshooting.md) for that trap in detail).

| Scope | Flag | Storage | Shared with team? | Use for |
|---|---|---|---|---|
| **local** (default) | `-s local` | `~/.claude.json` → `projects["<abs-project-path>"].mcpServers` | No — private to you, this exact project path | Your personal creds/instance pointed at one repo |
| **project** | `-s project` | `.mcp.json` at the repo root | Yes — committed to git | Shared team tooling (e.g. `playwright`, a shared internal MCP server) — teammates get prompted to approve/deny per-server the first time (tracked in `.claude/settings.local.json` → `enabledMcpjsonServers`/`disabledMcpjsonServers`) |
| **user** | `-s user` | `~/.claude.json` → top-level `mcpServers` (no project key) | No — available in *every* project you open, not tied to one repo | Personal tools you always want (e.g. your own API token) |

**Related internal file — do not hand-edit:** `~/.claude/mcp-needs-auth-cache.json` is a
CLI-managed cache, not a config file. It's a flat map of server display name →
`{ timestamp, id? }`, recording which remote HTTP/SSE servers were last seen needing OAuth —
it lets `claude mcp list` skip re-probing a server it already knows needs auth. It's
populated/pruned automatically. If a server's auth state seems stuck (e.g. it shows "Needs
authentication" right after you completed the OAuth flow), deleting this file forces a fresh
probe on the next `claude mcp list` — safe to do, it just gets rebuilt.

### VS Code (native MCP support, no extension needed)

VS Code ships native MCP support (Agent mode). Config file: **`.vscode/mcp.json`** in the
workspace root — same `mcpServers`-keyed JSON shape as Claude Code's `.mcp.json`. There's also
a user-level version reachable via the Command Palette → "MCP: Open User Configuration".

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "my-oauth-server": {
      "serverUrl": "https://example.com/api/mcp",
      "oauth": { "clientId": "...", "scopes": ["..."] }
    }
  }
}
```

⚠️ **Security note:** this file is a normal JSON file with no built-in secret redaction — a
token or password pasted directly into an `env` block sits in plaintext on disk. Keep
`.vscode/` in `.gitignore` and prefer `${ENV_VAR}` interpolation or an env file over
hardcoding secrets when the client supports it.

### IntelliJ / JetBrains IDEs

IntelliJ itself doesn't ship MCP support — it comes from whichever AI plugin you have installed.
The **GitHub Copilot plugin** reads `~/.config/github-copilot/intellij/mcp.json` (global, all
projects, all JetBrains IDEs using that plugin):

```json
{
  "servers": {
    "my-server": {
      "type": "stdio",
      "command": "my-command",
      "args": [],
      "env": { "TOKEN": "my_token" }
    }
  }
}
```

Note the key is `"servers"`, not `"mcpServers"` — Copilot's schema differs slightly from
Claude/VS Code's. If you're using a different AI plugin (JetBrains AI Assistant, Continue,
etc.), check that plugin's own Settings page — it'll usually have an "MCP Servers" section that
tells you exactly which file it reads, since this isn't standardized across plugins yet.

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS). Windows equivalent:
`%APPDATA%\Claude\claude_desktop_config.json`. Same `mcpServers` shape as Claude Code. Requires
a full app restart after editing — there's no live-reload or CLI equivalent to `claude mcp add`.

### Cursor / Windsurf (fork-of-VS-Code editors)

- **Cursor:** `~/.cursor/mcp.json` (user, all projects) or `.cursor/mcp.json` (project). This is
  the documented/standard location.
- **Windsurf:** `~/.codeium/windsurf/mcp_config.json`:
  ```json
  { "mcpServers": { "mcp-playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"], "env": {} } } }
  ```

---

## 2. Claude Code CLI — command cheatsheet

```bash
# List every configured server + live connection status
claude mcp list

# Full detail on one server: scope, resolved env vars, command
claude mcp get <name>

# Add a stdio server (default scope = local)
claude mcp add <name> -- <command> [args...]
claude mcp add my-server -e API_KEY=xxx -- npx my-mcp-server

# Add an HTTP/SSE server
claude mcp add --transport http <name> https://example.com/mcp
claude mcp add --transport http <name> https://example.com/mcp \
  --header "Authorization: Bearer ${TOKEN}"

# Add to a specific scope
claude mcp add <name> -s project -- <command>   # shared via .mcp.json
claude mcp add <name> -s user    -- <command>   # available in every project

# Remove (must match the scope it's actually stored in — claude mcp get tells you which)
claude mcp remove <name> -s local

# OAuth: run the browser login flow for an HTTP/SSE server, and clear stored tokens
claude mcp login <name>                 # NOT `claude mcp auth` — that subcommand does not exist
claude mcp login <name> --no-browser    # prints the auth URL, paste the redirect URL back
claude mcp logout <name>                # drop stored OAuth credentials for a clean retry

# Add with a full JSON blob — the only way to set OAuth fields the `add` flags don't expose
MCP_CLIENT_SECRET='...' claude mcp add-json <name> '{...}' --client-secret

# Inside an interactive session: inspect/toggle servers without leaving the chat
/mcp
```

⚠️ **`claude mcp login` only sees servers in scope for your current directory.** A server added
at default `local` scope is keyed to one absolute project path, so running `claude mcp login
<name>` from `~` fails with `No MCP server named "<name>"` and then lists your *other* servers —
which reads like the server vanished. `cd` into the project first, or add it at `-s user` scope.

**The `oauth` block in `add-json`** accepts more than the `add` flags do. Verified keys read out
of a recent CLI binary: `clientId`, `callbackPort`, `authServerMetadataUrl` (must be `https://`),
`scopes`, `xaa`. `authServerMetadataUrl` is the important one — it pins authorization-server
discovery instead of letting the client walk the `.well-known` chain, which is the documented
escape hatch when a provider's discovery metadata is self-inconsistent (see §4 below). Pass the
secret via the `MCP_CLIENT_SECRET` env var or the `--client-secret` prompt rather than piping it
in — `echo "secret" |` appends a trailing newline, and you don't want to spend an hour wondering
whether that newline got stored.

---

## 3. VS Code and IntelliJ — hands-on

### VS Code

1. Create `.vscode/mcp.json` in the workspace root (or use Command Palette → **MCP: Open Workspace
   Configuration** which scaffolds it for you).
2. Add a server entry (stdio or HTTP shape — see §1 examples).
3. Command Palette → **MCP: List Servers** to see status, or open the Agent mode chat panel —
   configured tools appear in the tools picker there.
4. **MCP: Open User Configuration** — same shape, applies to all workspaces, doesn't get
   committed to any repo.
5. Restart/reload is usually not required for stdio servers (VS Code watches the file), but if a
   server seems stuck, Command Palette → **MCP: Restart Server**.

If a teammate's repo has `.vscode/mcp.json` checked in with a server you don't recognize, VS
Code will prompt you to trust it the first time — same idea as Claude Code's
`enabledMcpjsonServers` approval gate for project-scope servers.

### IntelliJ (GitHub Copilot plugin)

1. Settings → Languages & Frameworks → GitHub Copilot → look for the MCP section (exact menu
   wording varies by plugin version), or edit `~/.config/github-copilot/intellij/mcp.json`
   directly.
2. Use the `"servers"` key (not `"mcpServers"`) — see the schema example in §1.
3. Reload the plugin (Settings → Plugins → gear icon → Restart, or just restart the IDE) —
   unlike VS Code, this config isn't hot-reloaded reliably.
4. To confirm a server connected, open the Copilot Chat panel — its tool/agent picker lists
   available MCP tools by server name.

If you're on JetBrains' own bundled AI Assistant instead of Copilot, look for **Settings → Tools
→ AI Assistant → Model Context Protocol** — it manages its own separate config store, not the
Copilot one above.

---

## 4. Case study: a self-installing stdio server with browser-session auth

A useful pattern to know, independent of any specific vendor: a self-installing MCP server that
registers itself and uses browser-session auth instead of OAuth.

**Install flow** (a typical `./install.sh`, idempotent — safe to re-run):

```bash
git clone <repo-url>
cd <repo>
./install.sh
```

What an installer like this typically does, in order:
1. Sets up a virtual environment / installs dependencies (and may check for a real browser
   binary, warning rather than failing if it's missing).
2. `claude mcp remove <name> -s user || true` then `claude mcp add -s user <name> -- <run-script>`
   — registers itself at **user scope** (available in every project, not just this repo) by
   shelling out to the same `claude mcp` command family from §2, not by hand-editing
   `~/.claude.json`.
3. Copies a companion `SKILL.md` into `~/.claude/skills/<name>/` — a Claude Code skill (separate
   from the MCP registration) that tells the agent which tools to use when, and how to recover
   from a session-expired error.
4. Runs a `login` subcommand that opens a **headful** browser window for a one-time interactive
   sign-in.

**Why browser-session auth instead of OAuth:** some SaaS content lives behind auth models that
reject generic API tokens — the only token that works is the one the web app mints client-side,
which can't be obtained via a headless OAuth flow. So the server drives a browser-automation
tool against a **real browser** on a single persistent profile. The login step opens that
profile headful for you to complete sign-in (including MFA) once; every other tool call reopens
the *same* profile **headless**, captures the live token, and calls the underlying API. A
background thread can refresh the token proactively so it doesn't go stale between calls. When
the on-disk session hard-expires, tools return a sentinel error (e.g. `session_expired`) instead
of a connection failure — the fix is always to log in again, not a `claude mcp` config change.

**Multi-session detail:** if every session that starts spawns its own thin server process, the
first one may also start a shared background daemon that owns the one browser profile so
concurrent sessions don't race each other launching multiple browser instances.

**Lesson for this guide:** `Status: ✓ Connected` here only ever means the stdio subprocess and
MCP handshake are fine (see [03-mcp-config-troubleshooting.md](03-mcp-config-troubleshooting.md)
for that caveat in general) — it says nothing about whether the browser-profile session is still
valid. That's a second, independent health signal this kind of server surfaces itself via a
sentinel tool-call error, not via `claude mcp` connection status.

---

## 5. Case study: setting up OAuth 2.0 PKCE against a vendor's native MCP server

The setup below is generalized from a real integration against an enterprise SaaS platform's
native MCP endpoint over OAuth 2.0 authorization-code + PKCE. Specifics (product names, table
names, exact UI labels) are intentionally omitted since they're vendor-specific; the traps
generalize well beyond any one platform. For what to do once you hit an `access_denied` that
survives every credential fix, see the discovery-mismatch and client-vs-server diagnostic
sections of [03-mcp-config-troubleshooting.md](03-mcp-config-troubleshooting.md) — this case
study covers the setup traps that come *before* you get that far.

### 5.1 Generalized end-to-end flow

```bash
# 1. Confirm a current CLI/runtime version — OAuth support for MCP is recent in most tools
node -v && claude --version

# 2. On the provider side: confirm the app/plugin is installed, create an OAuth client, enable PKCE (§5.2, §5.3)
# 3. On the provider side: copy the generated MCP endpoint URL from its admin console        (§5.4)

# 4. Register locally — pin authServerMetadataUrl or the login step fails
MCP_CLIENT_SECRET='<CLIENT_SECRET>' claude mcp add-json my-server '{
  "type": "http",
  "url": "https://<instance>.example.com/mcp/my-server",
  "oauth": {
    "clientId": "<CLIENT_ID>",
    "callbackPort": 3335,
    "authServerMetadataUrl": "https://<instance>.example.com/.well-known/oauth-authorization-server/mcp/my-server"
  }
}' --client-secret

# 5. Authorize (from the project dir if you used local scope — see the scope-precedence trap)
claude mcp login my-server
```

### 5.2 Trap: the obvious "is it installed" check can return a false negative

Many platforms ship this kind of integration as an installable app/package rather than a
core-platform plugin, so searching the platform's plugin list for it can return zero rows even
when it's fully installed and working. Don't conclude it's missing from a plugin search alone —
check the platform's application/package manager instead, or look for the feature's own admin
console/module directly. A platform's fuzzy/global search bar is also not reliable here: it can
return unrelated fuzzy matches instead of the actual admin module, so navigate to the module by
its known path rather than searching for it by display name.

### 5.3 Trap: a mandatory security setting can be absent from the creation form and default to off

Vendor documentation may list a setting (e.g. "Always use PKCE") as a mandatory checkbox on the
OAuth client creation form, warning that authentication will fail if it's unchecked — without
mentioning that the field is sometimes **not rendered on the creation form at all**, so a freshly
created client silently gets the insecure default. "Personalize form" style customization
usually only reorders fields already on the view; it does not add a missing one.

The reliable fix is to find the underlying field via the *list* view instead of the record form:
add the missing column to a list view (most admin UIs support this), then edit the value inline
for that record, and confirm it saved by reloading. If a security-relevant field seems to be
mandatory but invisible, this list-view technique generalizes well.

Also worth treating with suspicion: a "write-only" secret field. Some platforms let you save an
OAuth client with a blank secret, silently auto-generating one you can never read back. Always
set an explicit secret at creation time rather than leaving it blank, and avoid shell-special
characters in it if you'll ever need to pass it via command line.

### 5.4 Prefer an existing, working server configuration over building one from scratch

If the platform ships one or more pre-provisioned example/quickstart MCP servers, start from
one of those rather than hand-assembling a server URL from a display name. Copy the exact
endpoint URL field from the admin console verbatim — display names and URL path segments often
differ subtly (e.g. a dotted internal name vs. an underscored URL segment), and the local client
name you register it under must match whatever character set your CLI/tool restricts it to.
