import { useEffect, useState } from "react";
import { PRESETS, fmtInt, type Inputs } from "../lib/cost";
import { countTokens } from "../lib/tokens";

type Props = { inputs: Inputs; onChange: (next: Inputs) => void };

type Mode = "tokens" | "text";

export function Controls({ inputs, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("tokens");
  const [text, setText] = useState("");
  const [counting, setCounting] = useState(false);

  // Count tokens from pasted text (debounced). Only drives inputTokens while in text mode.
  useEffect(() => {
    if (mode !== "text") return;
    if (!text.trim()) return;
    setCounting(true);
    const id = setTimeout(() => {
      countTokens(text).then(
        (n) => {
          setCounting(false);
          onChange({ ...inputs, inputTokens: n });
        },
        () => setCounting(false),
      );
    }, 180);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, mode]);

  const set = (patch: Partial<Inputs>) => onChange({ ...inputs, ...patch });
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  const activePreset = PRESETS.find((p) => p.inputTokens === inputs.inputTokens && p.outputTokens === inputs.outputTokens)?.label;
  const cachePct = Math.round(inputs.cachedShare * 100);

  return (
    <div className="card flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.9375rem] font-semibold">Prompt</h2>
        <div role="tablist" aria-label="How to describe the prompt" className="seg">
          {(["tokens", "text"] as Mode[]).map((m) => (
            <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)}>
              {m === "tokens" ? "Tokens" : "Paste text"}
            </button>
          ))}
        </div>
      </div>

      {mode === "text" ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a system prompt, a document, a conversation…"
            rows={7}
            className="field field-sans resize-y leading-relaxed"
          />
          <p className="label">
            {counting
              ? "Counting…"
              : text.trim()
                ? `≈ ${fmtInt(inputs.inputTokens)} input tokens (o200k estimate)`
                : "Counted locally with the o200k tokenizer"}
          </p>
          {text.trim() && !counting ? (
            <p className="text-[0.75rem] leading-snug text-faint">
              The reply still counts: each call also bills {fmtInt(inputs.outputTokens)} output tokens, set below. That is usually most of the cost.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <span className="label">Presets</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip"
                aria-pressed={activePreset === p.label}
                title={p.hint}
                onClick={() => set({ inputTokens: p.inputTokens, outputTokens: p.outputTokens })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label">Input tokens</span>
          <input
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            className="field"
            value={inputs.inputTokens}
            disabled={mode === "text"}
            onChange={(e) => set({ inputTokens: num(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Output tokens</span>
          <input
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            className="field"
            value={inputs.outputTokens}
            onChange={(e) => set({ outputTokens: num(e.target.value) })}
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="label">Calls per day</span>
          <input
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            className="field"
            value={inputs.callsPerDay}
            onChange={(e) => set({ callsPerDay: num(e.target.value) })}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="cache" className="label">
            Cached input
          </label>
          <span className="num text-[0.8125rem] text-muted">{cachePct}%</span>
        </div>
        <input
          id="cache"
          type="range"
          min={0}
          max={100}
          step={5}
          className="range"
          aria-label="Share of input tokens served from the prompt cache"
          value={cachePct}
          onChange={(e) => set({ cachedShare: Number(e.target.value) / 100 })}
        />
        <p className="text-[0.75rem] leading-snug text-faint">
          Share of the input the provider serves from its prompt cache. Repeated system prompts and documents usually do.
        </p>
      </div>
    </div>
  );
}
