# MCP FAQ: Operating, Hosting, and Designing Custom Servers

Short answers to four questions that come up once a custom MCP server moves from the lab into real use. The answers build on [01-mcp-architecture.md](01-mcp-architecture.md) for roles and transports, [02-custom-servers.md](02-custom-servers.md) for the threat model and controls, [03-mcp-config-troubleshooting.md](03-mcp-config-troubleshooting.md) for diagnosis, and [04-mcp-guide.md](04-mcp-guide.md) for host-specific setup. The course slides cover the same ground on connecting models, custom servers and security, and the build-and-secure breakout.

## 1. Once the server is built, how do I maintain it and keep it secure and working?

A custom server holds access to real data, so it needs the same operating discipline as an internal API. Keep these items in place.

- **Inventory.** Record every server, its owner, its transport, its tools, and the clients that connect to it. Shadow servers (ones nobody remembers owning) are the most common gap. A config entry in a teammate's repository is enough to create one.
- **Pinned dependencies.** Pin the MCP SDK and runtime versions and review upgrades like any library change. Confirm which protocol revisions the client, server, and any gateway support. The course materials describe revision 2026-07-28; older clients and SDKs may still use earlier revisions. Reject malformed requests and handle unsupported versions explicitly rather than assuming compatibility.
- **Contract tests.** Treat tool names, input schemas, and output shapes as a public API. Test each tool with valid input, invalid input, and a disallowed target, and run those tests in CI. A renamed field breaks every prompt that depends on it, so add fields or version the tool name instead of changing them in place.
- **Reviewed tool descriptions.** The model chooses tools from their descriptions, so a description edit changes behavior. Review description changes in code review, and watch for description text that carries instructions (tool poisoning).
- **Authentication lifecycle.** For OAuth-protected HTTP servers, validate token audience, expiry, and permissions; rotate any client secrets you control under your organization's policy. Publish protected-resource metadata with the correct authorization-server location, and keep the authorization server's discovery metadata consistent. Discovery failures may happen before a request reaches the MCP server, so check client and authorization-server logs too.
- **Secrets.** Keep credentials in a secrets manager or the runtime's secret store, never in the repository. Scope each credential to the operations the server needs, and rotate after any suspected exposure.
- **Audit logs and metrics.** Log each request with timestamp, correlation ID, client identity, tool name, and allow or deny decision. Leave out raw arguments unless they are redacted. Track error rate, latency per tool, and result size so regressions show up before users report them.
- **Limits.** Set per-client rate limits, per-call timeouts, and memory caps so a looping agent cannot exhaust a backend.
- **Health and kill switch.** For a remote service, expose a health check; for local stdio, verify that the process starts and responds to discovery and tool calls. Keep a way to disable one tool or one whole server without a redeploy, whether in the host configuration, a gateway, or the server.
- **Patching.** Scan dependencies on a schedule and rebuild the runtime image regularly, even when the server code has not changed.
- **Incident runbook.** Document how to revoke tokens, disable a tool, pull the audit trail for the affected window, and notify affected users.

The failure modes that cause the most damage over time are silent schema drift, credentials that are expired or broader than needed, and servers with no current owner.

## 2. Where should the MCP server be hosted: with Claude or on-prem?

The model host is not necessarily where your server runs. Claude Code and Claude Desktop can launch a local stdio server process on your machine; remote connectors instead reach a separately hosted server. Choose the location based on where the data lives and which client needs access.

- **Local stdio on the developer machine.** Best for personal tools, prototypes, and single-user workflows. The client launches the process with the local user's permissions; stdio itself opens no listening network endpoint, though the process can make outbound requests if permitted. Each teammate needs an installation or managed deployment.
- **On-prem or private cloud.** Useful when the server reads internal systems such as ticketing, release, or plant data. You control identity, logging, uptime, and patching. An optional gateway can centralize TLS, authentication, rate limits, and allowlists. Check that the intended client can actually reach the endpoint: a private URL usable by a local client may not be reachable by a cloud-brokered connector.
- **Managed hosting on a cloud platform.** Best when you need a remote endpoint with fewer operational tasks. Check data residency, the network path to internal systems, and whether the platform offers gateway features. The slides' technology example describes portals that block remote MCP traffic that bypasses the approved server.

One path is to build and test locally over stdio, then consider a shared HTTP service if team-wide access is needed. A managed local deployment can also work when each user must reach private systems without exposing a remote endpoint. Claude custom remote connectors connect from Anthropic's cloud, so their HTTPS endpoint must be reachable from Anthropic's infrastructure (subject to your organization's network policy); confirm the approved path with your administrator before choosing a host.

## 3. What are the best practices and anti-patterns for building and hosting custom servers?

**Practices**

- Build bounded, fixed-operation tools, such as `get_release_status(release_id)`, rather than general-purpose ones. Each tool should answer one question about one kind of entity.
- Declare tool inputs with JSON Schema and validate them at runtime. Where appropriate, reject unknown fields and enforce length limits and enumerations; validate business rules and authorization separately.
- Keep tools read-only by default. Put writes in separate tools with an explicit risk tier; use a trusted host or gateway to obtain human approval for critical actions, rather than treating a model-supplied confirmation argument as proof of consent.
- Enforce authorization inside the server, on each call, against the authenticated identity. Host approval prompts provide user consent but cannot substitute for server-side access control.
- Return small, structured results with pagination and a size cap. Summarize rather than dump raw records.
- Make writes idempotent where possible, and return clear errors that do not leak internals.
- Use the SDK's supported lifecycle. Prefer stateless tools; when a workflow needs state, mint an explicit handle the client passes back, with its own expiry.
- Keep per-environment configuration outside the repository, and log which server version served each request.

**Anti-patterns**

- Tools that accept arbitrary URLs, file paths, SQL, or shell strings. These are the source of the path and command injection cases in the slides.
- Building shell commands, queries, or URLs by concatenating model input.
- A single "do anything" tool with a free-form action field.
- Returning raw API responses that include tokens, internal hostnames, or stack traces.
- Treating OAuth as the whole security model. OAuth authenticates and delegates access; it does not stop prompt injection or unsafe commands.
- Treating tool output as instructions. Content from data sources is untrusted input.
- Configuring the same server in both user and project scope, so a higher-precedence entry silently overrides the one you edited.
- Serving many users through one shared service account with no per-user identity in the logs.
- Shipping with no audit trail, or with no way to disable a tool.
- Running servers found online that nobody on the team has reviewed.

## 4. What design choices matter for production use?

- **Transport.** Use stdio for locally launched servers and Streamable HTTP for shared remote servers. Protect remote endpoints with TLS and appropriate authentication; validate HTTP `Origin` headers, and bind local HTTP servers to localhost.
- **Authorization model.** Decide whether the server acts as the user (per-user tokens, actions audited under that user) or as a service account (narrow, mostly read-only, with the requesting user recorded in every log line). Do not mix the two without clear labels.
- **Tool granularity.** Choose tools by user intent, not by database table. Fewer, well-named tools make the model less likely to pick the wrong one and keep the allowlist easy to review.
- **Risk tiers and approvals.** Classify each tool as read, low-risk write, or critical. Gate critical actions behind human approval before the handler runs, and record every allowed write.
- **Chained calls.** If the host supports programmatic tool calling, code can filter intermediate results before they enter the model's context; this is an optional host feature, not an MCP transport feature. The orchestrator must authorize each call, and any code-execution environment needs appropriate isolation, network restrictions, timeouts, and resource limits. Isolation does not replace server-side authorization.
- **Response design.** Cap result size, paginate, and return only the fields the next decision needs.
- **Versioning.** When a change breaks clients, version the tool, keep the previous version through a migration window, and announce the removal date.
- **Gateway when useful.** For shared deployments, a gateway can centralize identity, TLS, allowlists, rate limits, and logging. It is not required by MCP and does not replace per-call validation and authorization in the server.
- **Defense in depth.** Layer host controls, optional gateway controls, server validation and authorization, and workload isolation. No single layer should be the only protection.

The slides on defense in depth, server-side mitigation, and the enterprise gateway mapping give the detailed layer-by-layer view of these choices.

## Sources

- [MCP 2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28) ([changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), [version compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning))
- [MCP tools and input validation](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Streamable HTTP security requirements](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP authorization and discovery](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) ([security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations))
- [Claude Code MCP setup](https://code.claude.com/docs/en/mcp) and [Claude custom connector network requirements](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Anthropic programmatic tool calling](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/programmatic-tool-calling)
