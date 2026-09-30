import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "mcp-course-weather-server/1.0 (course-demo)";

const server = new Server(
  { name: "course-weather-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

async function nwsRequest(path) {
  const response = await fetch(`${NWS_API_BASE}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
  });
  if (!response.ok) {
    throw new Error(`NWS API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_alerts",
      description: "Get active weather alerts for a US state.",
      inputSchema: {
        type: "object",
        properties: {
          state: {
            type: "string",
            description: "Two-letter US state code, e.g. CA, NY",
          },
        },
        required: ["state"],
        additionalProperties: false,
      },
    },
    {
      name: "get_forecast",
      description: "Get the weather forecast for a US location by latitude and longitude.",
      inputSchema: {
        type: "object",
        properties: {
          latitude: { type: "number", description: "Latitude of the location" },
          longitude: { type: "number", description: "Longitude of the location" },
        },
        required: ["latitude", "longitude"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "get_alerts") {
      const { state } = request.params.arguments ?? {};
      const data = await nwsRequest(`/alerts/active/area/${String(state).toUpperCase()}`);
      const features = data.features ?? [];
      if (features.length === 0) {
        return { content: [{ type: "text", text: `No active alerts for ${state}.` }] };
      }
      const text = features
        .map((f) => {
          const p = f.properties;
          return `${p.event} — ${p.headline}\nSeverity: ${p.severity}\nAreas: ${p.areaDesc}`;
        })
        .join("\n---\n");
      return { content: [{ type: "text", text }] };
    }

    if (request.params.name === "get_forecast") {
      const { latitude, longitude } = request.params.arguments ?? {};
      const point = await nwsRequest(`/points/${latitude},${longitude}`);
      const forecast = await fetch(point.properties.forecast, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      }).then((r) => r.json());
      const periods = forecast.properties.periods.slice(0, 5);
      const text = periods
        .map((p) => `${p.name}: ${p.temperature}°${p.temperatureUnit}, ${p.shortForecast}`)
        .join("\n");
      return { content: [{ type: "text", text }] };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

await server.connect(new StdioServerTransport());
