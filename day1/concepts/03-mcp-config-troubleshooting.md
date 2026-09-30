# Concept: MCP Configuration and Troubleshooting

Connecting a server is rarely the hard part. The hard part is figuring out which config file actually won, and whether a failure lives in the transport, the server, or a downstream dependency. This reference covers the diagnostic habits that resolve most MCP connection problems.

## Core Mechanism

Most MCP hosts support more than one configuration scope, and they resolve conflicts silently. Claude Code, for example, supports a local scope (private, tied to one project path), a project scope (shared via a committed config file), and a user scope (available in every project). When a server name exists in more than one scope, the most specific scope wins without warning, so an edit made in the wrong file produces no error, just no effect.

A related trap is the orphaned config file: a file that looks like a legitimate scope, sits in a plausible location, and has the right JSON shape, but is never read by the tool's resolution logic. Editing it changes nothing, and a restart does not help, because the tool never consulted that file in the first place.

The fix in both cases is the same: never infer which file is authoritative from its path or shape. Ask the tool directly (`claude mcp get <name>`, or the equivalent inspection command for your host) and let it name the scope and storage location actually in effect. Edit or re-add the server through that scope, ideally through the CLI rather than a hand edit, so the write lands where the tool expects it.

## Connection Status vs. Functional Status

| Signal | What it actually proves |
| :--- | :--- |
| **"Connected"** | The transport came up: for `stdio`, the subprocess started and completed the MCP handshake. It says nothing about the server's own downstream dependencies.
| **Tool-call error** | The server accepted the call but failed doing the work, e.g. a database is unreachable or an upstream API rejected the request. This is where downstream failures actually surface.
| **"Needs authentication"** | An HTTP or SSE server requires an OAuth flow that has not completed yet. This must be resolved interactively; an agent running headlessly cannot complete it.

A green connection status is a weak signal. It confirms the pipe is open, not that anything useful will happen when a tool is called. When a tool call fails, read the error in the tool-call result, not the connection indicator, since that is the only place a downstream failure will appear.

## OAuth Discovery Mismatches

Some HTTP or SSE servers using OAuth serve two discovery documents that disagree with each other: the protected-resource metadata names one authorization server, while that authorization server's own metadata reports a different identity. A well-behaved MCP client detects this inconsistency and refuses to proceed, producing a bare `access_denied` with no explanatory detail and no entry in the server's own logs, because the client aborted before ever calling the token endpoint.

This produces a specific failure signature: the browser-based login step appears to succeed, but the CLI or client still reports denial, and the failure survives credential rotation, logout and retry, or a full restart, since none of those touch the actual cause.

The generalizable diagnostic step is to check, on the server side, whether a token was ever issued for that client. If no token exists, the client never reached the token endpoint, and the problem is upstream in discovery, not in credentials or scopes. If a token was issued, the exchange succeeded and the failure is client-side. Establishing this one fact before auditing configuration saves most of the debugging time.

## Common Pitfalls

- **Assuming config location from memory.** A file's path or name is not proof it's on the resolution path. Confirm with the tool, every time.
- **Treating "Connected" as "working".** Transport health and functional health are independent signals, and only one of them shows up in a connection indicator.
- **Debugging credentials before discovery.** An `access_denied` that survives every credential fix usually means the failure never reached the token exchange at all.
- **Expecting cross-host config sharing.** Each host, whether a CLI or an editor, maintains its own independent configuration. Fixing a server in one host has no effect on another host pointed at the same server name.
