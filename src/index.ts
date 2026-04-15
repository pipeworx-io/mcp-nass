interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * NASS MCP — USDA National Agricultural Statistics Service (Quick Stats)
 *
 * BYO key: requires a free API key from https://quickstats.nass.usda.gov/api
 * Passed via _apiKey parameter.
 *
 * Tools:
 * - nass_query: flexible query across all NASS Quick Stats data
 * - nass_crop_production: shortcut for crop production data
 * - nass_prices: prices received by farmers
 * - nass_livestock: livestock inventory, slaughter, and production
 * - nass_crop_progress: weekly crop progress and condition reports
 */


const BASE = 'https://quickstats.nass.usda.gov/api/api_GET/';

// ── Helpers ───────────────────────────────────────────────────────────

function extractKey(args: Record<string, unknown>): string {
  const key = args._apiKey as string;
  delete args._apiKey;
  if (!key) throw new Error('NASS API key required. Get one free at https://quickstats.nass.usda.gov/api and pass via _apiKey.');
  return key;
}

async function nassGet(apiKey: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(BASE);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'JSON');
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NASS API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  if (data.error) {
    const errors = data.error as string[];
    throw new Error(`NASS API error: ${Array.isArray(errors) ? errors.join('; ') : String(errors)}`);
  }

  return data;
}

interface NassRecord {
  commodity_desc?: string;
  statisticcat_desc?: string;
  state_name?: string;
  county_name?: string;
  agg_level_desc?: string;
  year?: number;
  freq_desc?: string;
  begin_code?: number;
  end_code?: number;
  reference_period_desc?: string;
  Value?: string;
  unit_desc?: string;
  source_desc?: string;
  sector_desc?: string;
  group_desc?: string;
  short_desc?: string;
  domain_desc?: string;
  domaincat_desc?: string;
  class_desc?: string;
}

function formatRecords(data: { data?: NassRecord[] }): unknown {
  const records = data.data ?? [];
  return {
    count: records.length,
    data: records.slice(0, 200).map((r) => ({
      commodity: r.commodity_desc ?? null,
      stat_category: r.statisticcat_desc ?? null,
      state: r.state_name ?? null,
      county: r.county_name ?? null,
      agg_level: r.agg_level_desc ?? null,
      year: r.year ?? null,
      frequency: r.freq_desc ?? null,
      period: r.reference_period_desc ?? null,
      value: r.Value ?? null,
      unit: r.unit_desc ?? null,
      description: r.short_desc ?? null,
    })),
    truncated: records.length > 200,
  };
}

// ── Tool definitions ──────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'nass_query',
    description:
      'Query USDA NASS Quick Stats — the most comprehensive source of US agricultural statistics. Supports flexible filtering by commodity, statistic category, geography, year, and more. Returns production, yield, acreage, prices, livestock, and other agricultural data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'NASS API key (free from quickstats.nass.usda.gov/api)' },
        commodity: { type: 'string', description: 'Commodity name, e.g., "CORN", "SOYBEANS", "WHEAT", "CATTLE", "MILK", "COTTON"' },
        stat_category: { type: 'string', description: 'Statistic category, e.g., "YIELD", "PRODUCTION", "AREA PLANTED", "AREA HARVESTED", "PRICE RECEIVED", "INVENTORY"' },
        state: { type: 'string', description: 'State name, e.g., "IOWA", "ILLINOIS", "CALIFORNIA" (optional)' },
        year: { type: 'string', description: 'Year or range, e.g., "2024" or "2020:2025" (optional)' },
        agg_level: { type: 'string', description: 'Aggregation level: "NATIONAL", "STATE", or "COUNTY" (optional)' },
        freq: { type: 'string', description: 'Frequency: "ANNUAL", "MONTHLY", or "WEEKLY" (optional)' },
        source: { type: 'string', description: 'Data source: "SURVEY" or "CENSUS" (optional, defaults to all)' },
        sector: { type: 'string', description: 'Sector: "CROPS", "ANIMALS & PRODUCTS", "ECONOMICS", "DEMOGRAPHICS", "ENVIRONMENTAL" (optional)' },
        group: { type: 'string', description: 'Commodity group, e.g., "FIELD CROPS", "FRUIT & TREE NUTS", "VEGETABLES" (optional)' },
      },
      required: ['_apiKey', 'commodity'],
    },
  },
  {
    name: 'nass_crop_production',
    description:
      'Get US crop production data — a shortcut for querying NASS survey data on crop yields, production totals, and planted/harvested acreage. Pre-filtered to source=SURVEY, sector=CROPS.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'NASS API key' },
        commodity: { type: 'string', description: 'Crop name: "CORN", "SOYBEANS", "WHEAT", "COTTON", "RICE", "SORGHUM", "BARLEY", "OATS"' },
        stat_category: { type: 'string', description: 'Statistic: "PRODUCTION", "YIELD", "AREA PLANTED", "AREA HARVESTED" (default: "PRODUCTION")' },
        state: { type: 'string', description: 'State name, e.g., "IOWA" (optional, defaults to national)' },
        year: { type: 'string', description: 'Year or range, e.g., "2024" or "2020:2025" (optional)' },
      },
      required: ['_apiKey', 'commodity'],
    },
  },
  {
    name: 'nass_prices',
    description:
      'Get prices received by US farmers for crops and livestock. Pre-filtered to source=SURVEY, stat_category=PRICE RECEIVED.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'NASS API key' },
        commodity: { type: 'string', description: 'Commodity: "CORN", "SOYBEANS", "WHEAT", "CATTLE", "HOGS", "MILK", "CHICKENS"' },
        state: { type: 'string', description: 'State name (optional, defaults to national)' },
        year: { type: 'string', description: 'Year or range (optional)' },
      },
      required: ['_apiKey', 'commodity'],
    },
  },
  {
    name: 'nass_livestock',
    description:
      'Get US livestock data — inventory counts, slaughter numbers, and production. Pre-filtered to sector=ANIMALS & PRODUCTS.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'NASS API key' },
        commodity: { type: 'string', description: 'Livestock: "CATTLE", "HOGS", "CHICKENS", "TURKEYS", "SHEEP", "MILK", "EGGS"' },
        stat_category: { type: 'string', description: 'Statistic: "INVENTORY", "SLAUGHTER", "PRODUCTION" (default: "INVENTORY")' },
        state: { type: 'string', description: 'State name (optional)' },
        year: { type: 'string', description: 'Year or range (optional)' },
      },
      required: ['_apiKey', 'commodity'],
    },
  },
  {
    name: 'nass_crop_progress',
    description:
      'Get weekly crop progress and condition reports — planting progress, emergence, blooming, harvest completion, and crop condition ratings (good/excellent/poor). Pre-filtered to source=SURVEY, freq=WEEKLY.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'NASS API key' },
        commodity: { type: 'string', description: 'Crop: "CORN", "SOYBEANS", "WHEAT", "COTTON", "SORGHUM"' },
        year: { type: 'string', description: 'Year, e.g., "2024" (required for progress data)' },
        state: { type: 'string', description: 'State name (optional, defaults to national)' },
      },
      required: ['_apiKey', 'commodity', 'year'],
    },
  },
];

// ── callTool dispatcher ───────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const key = extractKey(args);

  switch (name) {
    case 'nass_query':
      return nassQuery(key, args);
    case 'nass_crop_production':
      return nassCropProduction(key, args);
    case 'nass_prices':
      return nassPrices(key, args);
    case 'nass_livestock':
      return nassLivestock(key, args);
    case 'nass_crop_progress':
      return nassCropProgress(key, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Tool implementations ─────────────────────────────────────────────

async function nassQuery(apiKey: string, args: Record<string, unknown>) {
  const params: Record<string, string> = {};
  if (args.commodity) params.commodity_desc = (args.commodity as string).toUpperCase();
  if (args.stat_category) params.statisticcat_desc = (args.stat_category as string).toUpperCase();
  if (args.state) params.state_name = (args.state as string).toUpperCase();
  if (args.year) params.year = args.year as string;
  if (args.agg_level) params.agg_level_desc = (args.agg_level as string).toUpperCase();
  if (args.freq) params.freq_desc = (args.freq as string).toUpperCase();
  if (args.source) params.source_desc = (args.source as string).toUpperCase();
  if (args.sector) params.sector_desc = (args.sector as string).toUpperCase();
  if (args.group) params.group_desc = (args.group as string).toUpperCase();

  const data = await nassGet(apiKey, params);
  return formatRecords(data as { data?: NassRecord[] });
}

async function nassCropProduction(apiKey: string, args: Record<string, unknown>) {
  const params: Record<string, string> = {
    source_desc: 'SURVEY',
    sector_desc: 'CROPS',
    commodity_desc: (args.commodity as string).toUpperCase(),
    statisticcat_desc: ((args.stat_category as string) ?? 'PRODUCTION').toUpperCase(),
  };
  if (args.state) params.state_name = (args.state as string).toUpperCase();
  if (args.year) params.year = args.year as string;
  if (!args.state) params.agg_level_desc = 'NATIONAL';

  const data = await nassGet(apiKey, params);
  return formatRecords(data as { data?: NassRecord[] });
}

async function nassPrices(apiKey: string, args: Record<string, unknown>) {
  const params: Record<string, string> = {
    source_desc: 'SURVEY',
    statisticcat_desc: 'PRICE RECEIVED',
    commodity_desc: (args.commodity as string).toUpperCase(),
  };
  if (args.state) params.state_name = (args.state as string).toUpperCase();
  if (args.year) params.year = args.year as string;
  if (!args.state) params.agg_level_desc = 'NATIONAL';

  const data = await nassGet(apiKey, params);
  return formatRecords(data as { data?: NassRecord[] });
}

async function nassLivestock(apiKey: string, args: Record<string, unknown>) {
  const params: Record<string, string> = {
    source_desc: 'SURVEY',
    sector_desc: 'ANIMALS & PRODUCTS',
    commodity_desc: (args.commodity as string).toUpperCase(),
    statisticcat_desc: ((args.stat_category as string) ?? 'INVENTORY').toUpperCase(),
  };
  if (args.state) params.state_name = (args.state as string).toUpperCase();
  if (args.year) params.year = args.year as string;
  if (!args.state) params.agg_level_desc = 'NATIONAL';

  const data = await nassGet(apiKey, params);
  return formatRecords(data as { data?: NassRecord[] });
}

async function nassCropProgress(apiKey: string, args: Record<string, unknown>) {
  const params: Record<string, string> = {
    source_desc: 'SURVEY',
    freq_desc: 'WEEKLY',
    commodity_desc: (args.commodity as string).toUpperCase(),
    year: args.year as string,
  };
  if (args.state) params.state_name = (args.state as string).toUpperCase();
  if (!args.state) params.agg_level_desc = 'NATIONAL';

  const data = await nassGet(apiKey, params);
  return formatRecords(data as { data?: NassRecord[] });
}

export default { tools, callTool, meter: { credits: 5 }, provider: 'nass' } satisfies McpToolExport;
