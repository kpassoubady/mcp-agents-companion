# Weather MCP Server

A real, minimal MCP server over the free, keyless [National Weather Service API](https://www.weather.gov/documentation/services-web-api). It exposes two read-only tools:

- `get_forecast(latitude, longitude)` — 5-period forecast for a US location.
- `get_alerts(state)` — active weather alerts for a US state (two-letter code).

No API key, no signup, no production data. This is the same server pattern used in the official MCP quickstart docs.

## Install and verify

From `day1/weather-server`:

```bash
npm ci
npm run verify
```

Expected evidence:

```text
PASS discovered get_alerts and get_forecast
PASS get_forecast returned live NWS data
PASS get_alerts returned live NWS data
```

Requires network access to `api.weather.gov`.

## Run directly

```bash
npm start
```

The server speaks MCP over stdio and expects a client, not manual input.
