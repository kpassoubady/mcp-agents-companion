# Concept: MCP Architecture and Client Integration

The Model Context Protocol (MCP) gives AI applications a standard way to connect to external data sources and tools. Its architecture separates responsibilities for connection, discovery, approval, and execution.

## Core Mechanism

The MCP architecture relies on four distinct roles to facilitate secure data access for AI models:

1. **Host**: The user-facing application (e.g., Claude Code, VS Code with GitHub Copilot). It manages the conversation, applies policy controls, and requests actions.
2. **Client**: A component integrated into the Host that discovers server capabilities and handles the transport protocol (stdio or Streamable HTTP).
3. **Server**: A standalone process that exposes tools, resources, and prompts. It validates inputs, executes business logic, and returns results to the Client.
4. **Model**: The LLM that proposes tool calls based on instructions and capabilities.

The request path follows a strict flow:

* User makes a request to the Host.
* Host and Client discover allowed tools.
* Model proposes a tool call.
* Host applies approval rules (e.g., prompting the user).
* Client invokes the Server.
* Server validates the request, accesses the bounded data, and returns the result.

## Transport Comparisons

MCP supports two primary transport layers for communication between the Client and Server:

| Feature | `stdio` | Streamable HTTP (SSE/HTTP)
| :--- | :--- | :---
| **Primary Use Case** | Local development, desktop apps | Remote servers, enterprise gateways
| **Authentication** | Handled by local OS user context | Requires explicit headers or OAuth
| **Routing** | Direct process invocation | Can be routed via API Gateways
| **Network Exposure** | None (local only) | Exposed over network (requires TLS)

## Practical Implications

When integrating MCP into your local workflow, such as Claude Code or GitHub Copilot:

- **Stateless Core**: MCP `2026-07-28` is stateless at the protocol level. Servers that require state must mint explicit handles and require clients to pass those handles in subsequent tool arguments.
- **Client Configuration**: Clients register servers through configuration files (e.g., `claude mcp add` or `.vscode/mcp.json`). The client defines the connection, and the server defines the tools it exposes.
- **Security Boundaries**: The Server isolates raw data access from the untrusted model environment and enforces a strict boundary.

## Common Pitfalls

- **Duplicating Configuration**: Do not configure the same MCP server in both user settings and repository settings (`.vscode/mcp.json`) in VS Code, as it can cause conflicts.
- **Trusting Output**: Never blindly trust the output of an external server. External content can carry prompt injections.
- **Confusing Protocol with Client**: The MCP specification describes capabilities (like discovery and prompts), but a specific client (like Claude Code) might not expose all of those features to the user interface immediately.
