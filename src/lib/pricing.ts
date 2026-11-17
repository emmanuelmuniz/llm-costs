import snapshot from "../data/models.json";

export type Model = {
  /** OpenRouter-style id, e.g. "openai/gpt-5.4". Also the key for URL state. */
  id: string;
  name: string;
  provider: string;
  /** USD per 1M tokens */
  input: number;
  cachedInput?: number;
  output: number;
  context?: number;
  note?: string;
  source: "snapshot" | "live" | "custom";
  /** Snapshot prices kept around when live data replaced them, to flag drift. */
  snapshot?: { input: number; output: number };
};

export type Catalog = {
  /** Curated models shown by default. */
  featured: Model[];
  /** Everything we know about, keyed by id (featured + live + custom). */
  all: Map<string, Model>;
  status: "snapshot" | "live";
  fetchedAt?: number;
};

export const SNAPSHOT_DATE: string = snapshot.checkedAt;
export const SOURCES: { label: string; url: string }[] = snapshot.sources;

const LIVE_URL = "https://openrouter.ai/api/v1/models";
const CACHE_KEY = "llm-costs:live:v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  "x-ai": "xAI",
  mistralai: "Mistral",
  "meta-llama": "Meta",
  qwen: "Qwen",
  moonshotai: "Moonshot",
  "z-ai": "Z.ai",
  minimax: "MiniMax",
  cohere: "Cohere",
  amazon: "Amazon",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
  perplexity: "Perplexity",
  tencent: "Tencent",
};

type LiveEntry = {
  id: string;
  name: string;
  context_length?: number;
  architecture?: { output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string; input_cache_read?: string };
};

type CompactLive = { id: string; name: string; provider: string; input: number; cachedInput?: number; output: number; context?: number };

function snapshotModels(): Model[] {
  return snapshot.models.map((m) => ({ ...m, source: "snapshot" as const }));
}

export function snapshotCatalog(): Catalog {
  const featured = snapshotModels();
  return { featured, all: new Map(featured.map((m) => [m.id, m])), status: "snapshot" };
}

function providerFromId(id: string, name: string): string {
  const prefix = id.split("/")[0] ?? "";
  if (PROVIDER_NAMES[prefix]) return PROVIDER_NAMES[prefix];
  const fromName = name.split(":")[0];
  return fromName && fromName !== name ? fromName.trim() : prefix;
}

function toCompact(entries: LiveEntry[]): CompactLive[] {
  const out: CompactLive[] = [];
  for (const e of entries) {
    if (!e.pricing?.prompt || !e.pricing.completion) continue;
    if (e.id.includes(":")) continue; // :batch, :free, :nitro variants
    const mods = e.architecture?.output_modalities;
    if (mods && !mods.includes("text")) continue;
    const input = Number(e.pricing.prompt) * 1e6;
    const output = Number(e.pricing.completion) * 1e6;
    if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) continue;
    const cached = e.pricing.input_cache_read ? Number(e.pricing.input_cache_read) * 1e6 : undefined;
    const name = e.name.includes(": ") ? e.name.slice(e.name.indexOf(": ") + 2) : e.name;
    out.push({
      id: e.id,
      name,
      provider: providerFromId(e.id, e.name),
      input: round(input),
      cachedInput: cached !== undefined && Number.isFinite(cached) ? round(cached) : undefined,
      output: round(output),
      context: e.context_length,
    });
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function readCache(): { at: number; models: CompactLive[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; models: CompactLive[] };
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(models: CompactLive[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), models }));
  } catch {
    /* storage may be unavailable; live data still works for this session */
  }
}

async function fetchLive(): Promise<{ at: number; models: CompactLive[] }> {
  const cached = readCache();
  if (cached) return cached;
  const res = await fetch(LIVE_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OpenRouter responded ${res.status}`);
  const json = (await res.json()) as { data: LiveEntry[] };
  const models = toCompact(json.data);
  if (models.length === 0) throw new Error("OpenRouter returned no priced models");
  writeCache(models);
  return { at: Date.now(), models };
}

/** Snapshot first; live prices layered on top when the fetch succeeds. */
export async function loadCatalog(): Promise<Catalog> {
  const base = snapshotCatalog();
  let live: { at: number; models: CompactLive[] };
  try {
    live = await fetchLive();
  } catch {
    return base;
  }
  const liveById = new Map(live.models.map((m) => [m.id, m]));
  const featured = base.featured.map((m): Model => {
    const l = liveById.get(m.id);
    if (!l) return m;
    return {
      ...m,
      input: l.input,
      cachedInput: l.cachedInput ?? m.cachedInput,
      output: l.output,
      context: l.context ?? m.context,
      source: "live",
      snapshot: { input: m.input, output: m.output },
    };
  });
  const all = new Map<string, Model>();
  for (const l of live.models) all.set(l.id, { ...l, source: "live" });
  for (const m of featured) all.set(m.id, m);
  return { featured, all, status: "live", fetchedAt: live.at };
}

/** True when live and snapshot prices disagree by more than 15% on either side. */
export function hasDrift(m: Model): boolean {
  if (!m.snapshot) return false;
  const d = (a: number, b: number) => (b === 0 ? a !== 0 : Math.abs(a - b) / b > 0.15);
  return d(m.input, m.snapshot.input) || d(m.output, m.snapshot.output);
}
