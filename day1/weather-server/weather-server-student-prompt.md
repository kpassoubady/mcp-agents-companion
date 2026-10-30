Markdown · weather-server-student-prompt.md

# Build Your Own Weather MCP Server

## Overview

In this lab, you'll build your own **Model Context Protocol (MCP) server** that exposes tools to fetch data from a public API. You'll follow the same architecture as the example weather server, but adapt it for a **different data domain** (your choice).

This is a hands-on exercise in:

- Understanding MCP server patterns (tool definition, request handlers)
- Working with public APIs (no authentication required)
- Building with Node.js ES Modules and the MCP SDK
- Testing your server against live API data

---

## Your Mission

Create an MCP server that:

1. **Defines 2 tools** that call a public, free API (no authentication required)
2. **Validates tool inputs** with JSON schemas (`additionalProperties: false`)
3. **Handles errors gracefully** following the MCP error protocol
4. **Connects via stdio** like the weather server does
5. **Passes a verification test** against live API data

### Domain Options

Pick one (or propose your own public, keyless API):

- **Astronomy** → [Open Notify API](http://api.open-notify.org/) → Tools: `get_iss_location()`, `get_astronauts_in_space()`
- **Geolocation** → [OpenWeather Geocoding API](https://openweathermap.org/api/geocoding-api) (free tier) → Tools: `geocode_city(city)`, `get_coordinates(lat, lon)`
- **Internet Status** → [Public APIs List](https://github.com/public-apis/public-apis) → Any keyless JSON endpoint
- **Your choice** → Any public, quota-generous API (GitHub REST API, OpenLibrary, PokeAPI, etc.)

---

## Lab Structure

### Part 1: Setup (15 min)

```bash
# Create your project directory
mkdir my-mcp-server
cd my-mcp-server

# Initialize project with Node.js 22+
npm init -y

# Update package.json:
# - Set "type": "module"
# - Set "engines": {"node": ">=22"}
# - Add script: "start": "node server.mjs"
# - Add script: "verify": "node verify.mjs"

# Install dependencies
npm install @modelcontextprotocol/sdk@1.30.0
```

### Part 2: Define Your Tools (30 min)

**In `server.mjs`:**

1. **Create a `Server` instance** with your server name and capabilities
2. **Define 2 tools** with:
   - Clear, concise descriptions
   - Input schema with specific properties
   - `additionalProperties: false` (strict validation)
3. **Implement `ListToolsRequestSchema` handler** → return your tool definitions

### Part 3: Implement Tool Logic (45 min)

**In `server.mjs`:**

1. **Create a helper function** (like `nwsRequest`) to handle API calls with proper headers
2. **Implement `CallToolRequestSchema` handler** that:
   - Validates the tool name
   - Extracts arguments from the request
   - Calls your API
   - Parses and formats the response as text
   - Returns MCP-compliant content/error responses

### Part 4: Write a Verification Test (30 min)

**In `verify.mjs`:**

Create a test script that:

1. Spawns your server as a child process
2. Connects to it via stdio
3. Calls each tool with valid test inputs
4. Verifies the responses are non-empty and make sense
5. Reports PASS/FAIL for each step

### Part 5: Test and Debug (30 min)

```bash
npm start                 # Run your server (requires an MCP client)
npm run verify            # Test your tools
```

---

## Key Architecture Patterns

### Server Definition

```javascript
const server = new Server(
  { name: "your-server-name", version: "1.0.0" },
  { capabilities: { tools: {} } },
);
```

### Tool Handler

```javascript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "tool_name",
      description: "What this tool does",
      inputSchema: {
        type: "object",
        properties: {
          param: { type: "string", description: "..." },
        },
        required: ["param"],
        additionalProperties: false,
      },
    },
  ],
}));
```

### Call Handler

```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "tool_name") {
      const { param } = request.params.arguments ?? {};
      // Call API, format response
      return { content: [{ type: "text", text: result }] };
    }
    return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});
```

### Connect to Stdio

```javascript
await server.connect(new StdioServerTransport());
```

---

## Checklist

- [ ] Project setup with `package.json` configured for ES modules and Node 22+
- [ ] `server.mjs` defines 2 tools with schemas and `additionalProperties: false`
- [ ] `ListToolsRequestSchema` handler returns tool definitions
- [ ] `CallToolRequestSchema` handler implements both tools
- [ ] API helper function handles errors and sets proper User-Agent headers
- [ ] Response formatting: text content, clear human-readable output
- [ ] Error handling: returns `isError: true` on failures
- [ ] `verify.mjs` spawns server and tests both tools
- [ ] `npm run verify` passes all tests against live API
- [ ] `npm start` connects to stdio without errors

---

## Reference: Weather Server Architecture

The example weather server you're following:

- **API:** US National Weather Service (free, no auth)
- **Tools:** `get_alerts(state)`, `get_forecast(latitude, longitude)`
- **Verification:** 3 test passes (tool discovery, alerts data, forecast data)
- **Error handling:** Try/catch + MCP error protocol

Your server should follow the same patterns, adapted for your chosen API.

---

## Troubleshooting

**"Cannot find module '@modelcontextprotocol/sdk'"**

- Run `npm ci` (or `npm install`) to ensure dependencies are installed
- Check `package.json` has the MCP SDK dependency listed

**Server starts but verification fails**

- Check API endpoint URLs are correct
- Verify request headers (User-Agent, Accept) match API requirements
- Test API call manually in curl/fetch to debug response format

**Verification script can't connect to server**

- Ensure server.mjs connects via `StdioServerTransport`
- Check verify.mjs spawns the server correctly with `stdio: "pipe"`
- Add console logging to debug connection issues

**Tool returns empty or malformed data**

- Log the raw API response to see what you're getting
- Check response parsing logic (JSON path, field names)
- Format the text output clearly for humans

---

## Submission

Push your completed server to a `feature/my-mcp-server` branch with:

- Working `server.mjs` and `verify.mjs`
- Updated `package.json`
- Brief README explaining your API choice and tools
- Verification output showing all tests passing

When your branch is ready, open a pull request to the course repo.