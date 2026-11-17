import { DEFAULT_INPUTS, type Inputs } from "./cost";

export type UrlState = { inputs: Inputs; selected: string[] | null };

export function readUrl(): UrlState {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  const p = new URLSearchParams(hash);
  const num = (k: string, fallback: number, min = 0) => {
    const v = Number(p.get(k));
    return Number.isFinite(v) && p.has(k) ? Math.max(min, v) : fallback;
  };
  const inputs: Inputs = {
    inputTokens: num("in", DEFAULT_INPUTS.inputTokens),
    outputTokens: num("out", DEFAULT_INPUTS.outputTokens),
    callsPerDay: num("calls", DEFAULT_INPUTS.callsPerDay),
    cachedShare: Math.min(1, num("cache", DEFAULT_INPUTS.cachedShare * 100) / 100),
  };
  const m = p.get("m");
  const selected = m ? m.split(",").filter(Boolean) : null;
  return { inputs, selected };
}

export function writeUrl(inputs: Inputs, selected: string[]): void {
  const p = new URLSearchParams();
  p.set("in", String(inputs.inputTokens));
  p.set("out", String(inputs.outputTokens));
  p.set("calls", String(inputs.callsPerDay));
  p.set("cache", String(Math.round(inputs.cachedShare * 100)));
  p.set("m", selected.join(","));
  const next = `#${p.toString()}`;
  if (location.hash !== next) history.replaceState(null, "", next);
}
