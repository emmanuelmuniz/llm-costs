// Refreshes src/data/models.json with current prices from OpenRouter's public models API.
// Only models already in the snapshot are touched; names, notes and providers are kept.
// Usage: node scripts/update-snapshot.mjs
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/models.json", import.meta.url);
const LIVE_URL = "https://openrouter.ai/api/v1/models";

const snapshot = JSON.parse(await readFile(FILE, "utf8"));
const res = await fetch(LIVE_URL, { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(`OpenRouter responded ${res.status}`);
const { data } = await res.json();
const live = new Map(data.map((m) => [m.id, m]));

const perM = (s) => Math.round(Number(s) * 1e6 * 1e6) / 1e6;
let changed = 0;
for (const m of snapshot.models) {
  const l = live.get(m.id);
  if (!l?.pricing?.prompt || !l.pricing.completion) {
    console.warn(`no live price for ${m.id}`);
    continue;
  }
  const next = {
    input: perM(l.pricing.prompt),
    output: perM(l.pricing.completion),
    cachedInput: l.pricing.input_cache_read ? perM(l.pricing.input_cache_read) : m.cachedInput,
  };
  for (const k of Object.keys(next)) {
    if (next[k] !== undefined && next[k] !== m[k]) {
      console.log(`${m.id} ${k}: ${m[k]} -> ${next[k]}`);
      m[k] = next[k];
      changed++;
    }
  }
}
snapshot.checkedAt = new Date().toISOString().slice(0, 10);
await writeFile(FILE, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`${changed} price field(s) changed · checkedAt ${snapshot.checkedAt}`);
