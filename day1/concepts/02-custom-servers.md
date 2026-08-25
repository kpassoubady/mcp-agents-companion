# Concept: Custom MCP Servers and Security

A custom MCP Server exposes bounded, read-only utilities while controlling the risks of connecting third-party systems to automated AI assistants. Strict boundaries, a clear threat model, and layered controls limit its authority.

## Core Mechanism

A custom MCP Server defines schemas for the tools and resources it exposes. TypeScript and Python servers must explicitly register tool handlers.

The security mechanism centers on the principle of least privilege. The server must validate every input, restrict operations to an allowlist, and assume all payloads provided by the client are untrusted.

## Security Controls and Threat Model

Connecting an LLM to local tools introduces specific risks. The following table maps these risks to their corresponding controls:

| Risk | Practical Control
| :--- | :---
| **Command / Path Injection** | Do not invoke shells. Use strict JSON Schema validation and explicit allowlists or canonical path boundaries.
| **Prompt Injection** | Treat all server output as untrusted. The Host must isolate external content from system instructions.
| **Excessive Agency** | Implement read-only tools. Rely on the Host for user-approval prompts before execution.
| **Shadow Servers** | Maintain an explicit inventory of approved servers in configuration management.
| **Secret Exposure** | Never hardcode production credentials. Use local environment variables or synthetic data for testing.

## Practical Implications

- **Server-Side Validation**: A Host's confirmation dialog is not an authorization boundary. The MCP Server must enforce permissions independently of the model's instructions and the Host's behavior.
- **Audit Events**: The server should emit minimal, redacted audit logs for every request. This includes the timestamp, correlation ID, tool name, and allow/deny decision, without exposing sensitive arguments.
- **Local vs Production**: Local `stdio` labs rely on the developer's environment for authentication. In a production environment, remote servers sit behind an MCP-aware API Gateway that enforces TLS termination, client identity, rate limits, and token audience validation.

## Common Pitfalls

- **Overstating OAuth**: OAuth 2.0 authenticates and delegates access. Separate controls must prevent prompt injection, tool poisoning, and unsafe command construction.
- **Unrestricted Access**: Avoid creating tools that accept arbitrary URLs, filesystem paths, or command strings. Always use fixed operations over bounded, synthetic targets for custom utilities.
- **Ignoring Legacy Versions**: While `2026-07-28` is the current standard, some gateways or clients might not enforce version consistency. Ensure your server explicitly validates the request format and rejects malformed legacy payloads.
