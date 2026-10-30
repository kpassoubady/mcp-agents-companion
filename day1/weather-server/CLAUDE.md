# Weather MCP Server

A minimal MCP (Model Context Protocol) server that exposes weather data from the US National Weather Service API. Provides two read-only tools for forecasts and active weather alerts. Uses the free, keyless NWS API.

## Tech Stack

- **Language/Runtime:** Node.js 22+
- **Framework:** `@modelcontextprotocol/sdk`
- **Type:** ES Module
- **Key dependencies:** MCP SDK (v1.30.0)

## Project Structure

```
server.mjs      Main MCP server implementation, handles tool definitions and requests
verify.mjs      Verification script that tests both tools against live NWS API
package.json    Project metadata and scripts
README.md       User-facing documentation
```

## Key Commands

```bash
npm ci              # Install exact dependencies
npm start           # Run the MCP server (requires MCP client)
npm run verify      # Test both tools against live NWS API
```

## Conventions

- Tools are read-only (no mutations)
- Uses National Weather Service public API (no authentication required)
- Requires network access to `api.weather.gov`
- Tool inputs are validated via JSON schema with `additionalProperties: false`
- Error responses follow MCP protocol with `isError: true`

## Related Context

This server is part of the **MCP with AI Agents** course (day1 lab). See parent `CLAUDE.md` for course overview and related repositories.
