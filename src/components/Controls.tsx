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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="label">Prompt</h2>
          <div role="tablist" aria-label="How to describe the prompt" className="flex gap-1 text-[0.8125rem]">
            {(["tokens", "text"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 transition-colors ${mode === m ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
              >
                {m === "tokens" ? "Tokens" : "Paste text"}
              </button>
            ))}
          </div>
        </div>

        {mode === "text" ? (
          <div className="mt-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a system prompt, a document, a conversation…"
              rows={7}
              className="field resize-y rounded-none !text-[0.9375rem] leading-relaxed"
              style={{ fontFamily: "var(--font-sans)" }}
            />
            <p className="label mt-2">
              {counting ? "Counting…" : text.trim() ? `≈ ${fmtInt(inputs.inputTokens)} input tokens` : "Counted locally with the o200k tokenizer"}
              {text.trim() && !counting ? <span className="text-faint"> · o200k estimate; other providers differ slightly</span> : null}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
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
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6">
        <label className="block">
          <span className="label">Input tokens</span>
          <input
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            className="field mt-1"
            value={inputs.inputTokens}
            disabled={mode === "text"}
            onChange={(e) => set({ inputTokens: num(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="label">Output tokens</span>
          <input
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            className="field mt-1"
            value={inputs.outputTokens}
            onChange={(e) => set({ outputTokens: num(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="label">Calls per day</span>
          <input
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            className="field mt-1"
            value={inputs.callsPerDay}
            onChange={(e) => set({ callsPerDay: num(e.target.value) })}
          />
        </label>
        <div className="block">
          <div className="flex items-baseline justify-between">
            <span className="label">Cached input</span>
            <span className="num text-sm text-muted">{Math.round(inputs.cachedShare * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            className="range mt-4"
            aria-label="Share of input tokens served from the prompt cache"
            value={Math.round(inputs.cachedShare * 100)}
            onChange={(e) => set({ cachedShare: Number(e.target.value) / 100 })}
          />
          <p className="mt-2 text-[0.75rem] leading-snug text-faint">
            Share of the input that hits the provider's prompt cache. System prompts and long documents repeated across calls usually do.
          </p>
        </div>
      </div>
    </div>
  );
}
