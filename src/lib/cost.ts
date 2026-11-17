import type { Model } from "./pricing";

export type Inputs = {
  inputTokens: number;
  outputTokens: number;
  callsPerDay: number;
  /** Share of input tokens served from a prompt cache, 0..1 */
  cachedShare: number;
};

export const DEFAULT_INPUTS: Inputs = {
  inputTokens: 1500,
  outputTokens: 400,
  callsPerDay: 1000,
  cachedShare: 0,
};

export type Preset = { label: string; hint: string; inputTokens: number; outputTokens: number };

export const PRESETS: Preset[] = [
  { label: "Chat turn", hint: "short system prompt + a question", inputTokens: 1500, outputTokens: 400 },
  { label: "RAG answer", hint: "a few retrieved chunks", inputTokens: 8000, outputTokens: 600 },
  { label: "Summarize a doc", hint: "~20 pages in", inputTokens: 30000, outputTokens: 1500 },
  { label: "Agent step", hint: "long context, tool results", inputTokens: 60000, outputTokens: 2000 },
];

export type CostRow = {
  model: Model;
  perCall: number;
  perDay: number;
  perMonth: number;
};

export function costPerCall(m: Model, i: Inputs): number {
  const cachedPrice = m.cachedInput ?? m.input;
  const fresh = i.inputTokens * (1 - i.cachedShare) * m.input;
  const cached = i.inputTokens * i.cachedShare * cachedPrice;
  const out = i.outputTokens * m.output;
  return (fresh + cached + out) / 1e6;
}

export function computeRows(models: Model[], i: Inputs): CostRow[] {
  return models
    .map((model) => {
      const perCall = costPerCall(model, i);
      const perDay = perCall * i.callsPerDay;
      return { model, perCall, perDay, perMonth: perDay * 30 };
    })
    .sort((a, b) => a.perCall - b.perCall);
}

export function fmtUSD(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (n === 0) return "$0";
  const abs = Math.abs(n);
  let digits: number;
  if (abs >= 1000) digits = 0;
  else if (abs >= 100) digits = 1;
  else if (abs >= 1) digits = 2;
  else if (abs >= 0.01) digits = 4;
  else digits = 6;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtRate(n: number): string {
  // $/1M tokens; show 2 decimals, or 3 for sub-dollar values
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 });
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}
