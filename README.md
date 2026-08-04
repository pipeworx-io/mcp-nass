# USDA NASS — Agricultural Statistics

The USDA National Agricultural Statistics Service. Crop production, livestock inventory, prices, planted/harvested acres, yields — the official US agricultural data. State and county level for major commodities. Free, no auth (light rate limit).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Why this matters for AI agents

For agricultural commodity questions — supply outlook, price trends, regional production — NASS is the authoritative source. Used by USDA's own analysts, commodity traders, and agribusiness. Pair with [BLS](/docs/reference/bls) for ag wages/PPI and [Comtrade](/docs/reference/comtrade) for global trade flows.

Common flows:

- **Production estimates.** "What's the corn production forecast?" → `nass_query({commodity: "CORN", agg_level: "NATIONAL"})` → annual and monthly forecasts.
- **State-level breakdown.** Same query with `state: "IOWA"` for state-specific.
- **Livestock inventory.** "How many cattle in Texas?" → `nass_query({commodity: "CATTLE", state: "TEXAS"})`.
- **Prices.** Average farm-gate prices by commodity and time period.

Used by the `agricultural_commodity_brief` recipe.

## Auth

NASS Quickstats requires a free API key from https://quickstats.nass.usda.gov/api. Pass via `_apiKey`. Without a key, calls fail; with one, generous limits.

## Major commodities tracked

Field crops: corn, soybeans, wheat, cotton, rice, sorghum, barley, oats, peanuts, sugar.

Livestock: cattle (calves, steers, dairy), hogs, sheep, poultry (broilers, layers, turkeys).

Specialty: vegetables (potatoes, tomatoes), fruit (apples, citrus), tree nuts, ornamentals.

Use exact USDA commodity names — the API is finicky about spelling and capitalization.

## Update cadence

| Report | Frequency |
|---|---|
| Crop Production | Monthly during growing season; final in January |
| Quarterly Hogs and Pigs | March, June, September, December |
| Cattle Inventory | January, July |
| Prices Received / Paid | Monthly |
| Crop Progress (planted / harvested %) | Weekly during growing season |

The crop-progress reports are the highest-frequency signal.

## Common pitfalls

- **Year-over-year confusion in monthly reports.** Mid-season Crop Production reports give a current-year forecast revised monthly. Compare to prior year, not to last month's forecast.
- **Yield vs. production.** Yield is per-acre (e.g., bushels/acre). Production is total (yield × harvested acres). They tell different stories.
- **NASS isn't WASDE.** The World Agricultural Supply and Demand Estimates (WASDE) is a separate USDA report that synthesizes NASS + global data with supply/demand forecasts. For "outlook" questions, you may want WASDE.
- **State-level data sparser for minor crops.** Detailed state-level coverage is best for top-producing states. Smaller producers may aggregate to "Other states" or have suppressed data.
- **Imperial units.** Bushels, pounds, head, acres. Comtrade uses kilograms — convert when cross-referencing.
- **Reference period.** Cattle reports are point-in-time (January 1 inventory); crop reports often cover marketing year (varies by crop). Read the metadata.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "nass": {
      "url": "https://gateway.pipeworx.io/nass/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Nass data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
