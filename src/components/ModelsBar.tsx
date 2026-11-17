import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { fmtRate } from "../lib/cost";
import type { Catalog, Model } from "../lib/pricing";

type Props = {
  catalog: Catalog;
  custom: Model[];
  selected: string[];
  onToggle: (id: string) => void;
  onAddCustom: (m: Model) => void;
  onRemoveCustom: (id: string) => void;
};

export function ModelsBar({ catalog, custom, selected, onToggle, onAddCustom, onRemoveCustom }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const customById = useMemo(() => new Map(custom.map((m) => [m.id, m])), [custom]);
  const chips = selected
    .map((id) => catalog.all.get(id) ?? customById.get(id))
    .filter((m): m is Model => m !== undefined);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <section aria-labelledby="models-title" className="flex flex-col gap-3.5">
      <div className="flex items-baseline gap-2.5">
        <h2 id="models-title" className="text-[0.9375rem] font-semibold">
          Models
        </h2>
        <span className="text-[0.8125rem] text-faint">
          {selected.length} of {catalog.all.size + custom.length}
        </span>
      </div>

      <div ref={wrap} className="relative">
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((m) => (
            <span key={m.id} className="tag">
              {m.name}
              <button type="button" onClick={() => onToggle(m.id)} aria-label={`Remove ${m.name}`}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="tag-add" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
            <Plus />
            Add model
          </button>
        </div>

        {open ? (
          <Popover
            catalog={catalog}
            custom={custom}
            selected={new Set(selected)}
            onToggle={onToggle}
            onAddCustom={onAddCustom}
            onRemoveCustom={onRemoveCustom}
          />
        ) : null}
      </div>
    </section>
  );
}

function Plus() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 1.5v11M1.5 7h11" />
    </svg>
  );
}

type PopProps = {
  catalog: Catalog;
  custom: Model[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAddCustom: (m: Model) => void;
  onRemoveCustom: (id: string) => void;
};

function Popover({ catalog, custom, selected, onToggle, onAddCustom, onRemoveCustom }: PopProps) {
  const [query, setQuery] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (q) {
      const terms = q.split(/\s+/);
      const hits = [...catalog.all.values(), ...custom]
        .filter((m) => terms.every((t) => `${m.name} ${m.provider} ${m.id}`.toLowerCase().includes(t)))
        .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name))
        .slice(0, 80);
      return group(hits);
    }
    const g = group(catalog.featured);
    if (custom.length) g.push(["Custom", custom]);
    return g;
  }, [catalog, custom, q]);

  const total = groups.reduce((n, [, ms]) => n + ms.length, 0);

  return (
    <div role="dialog" aria-label="Add a model" className="pop absolute left-0 top-full z-20 mt-2 flex w-[min(28rem,100%)] flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-rule px-3.5 py-3">
        <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-faint">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search models"
          placeholder={catalog.status === "live" ? `Search ${catalog.all.size} models… grok, qwen, mistral` : "Search models…"}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        />
        <kbd className="num rounded border border-rule px-1.5 text-[0.6875rem] text-faint">esc</kbd>
      </div>

      <div className="max-h-[26rem] overflow-y-auto py-1.5">
        {total === 0 ? (
          <p className="px-3.5 py-6 text-center text-sm text-muted">No matches</p>
        ) : (
          groups.map(([provider, models]) => (
            <div key={provider}>
              <div className="th px-3.5 pb-1 pt-2.5">{provider}</div>
              {models.map((m) => (
                <label key={m.id} className="row">
                  <input type="checkbox" className="box" checked={selected.has(m.id)} onChange={() => onToggle(m.id)} />
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate text-sm">{m.name}</span>
                    {m.context ? <span className="shrink-0 text-[0.75rem] text-faint">{fmtContext(m.context)} ctx</span> : null}
                  </span>
                  <span className="num shrink-0 text-[0.75rem] text-muted">
                    {fmtRate(m.input)} / {fmtRate(m.output)}
                  </span>
                  {m.source === "custom" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onRemoveCustom(m.id);
                      }}
                      className="quiet text-[0.75rem]"
                      aria-label={`Delete ${m.name}`}
                    >
                      Delete
                    </button>
                  ) : null}
                </label>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-rule bg-panel px-3.5 py-2.5">
        {customOpen ? (
          <CustomForm
            onAdd={(m) => {
              onAddCustom(m);
              setCustomOpen(false);
            }}
            onCancel={() => setCustomOpen(false)}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.75rem] text-faint">$/1M in / out · any OpenRouter model</span>
            <button type="button" className="text-[0.8125rem] font-medium text-accent" onClick={() => setCustomOpen(true)}>
              Custom price…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function group(models: Model[]): [string, Model[]][] {
  const map = new Map<string, Model[]>();
  for (const m of models) {
    const list = map.get(m.provider) ?? [];
    list.push(m);
    map.set(m.provider, list);
  }
  return [...map.entries()];
}

function fmtContext(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `${Math.round(n / 1000)}k`;
}

function CustomForm({ onAdd, onCancel }: { onAdd: (m: Model) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [cached, setCached] = useState("");
  const [output, setOutput] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const i = Number(input);
    const o = Number(output);
    if (!name.trim() || !Number.isFinite(i) || !Number.isFinite(o)) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    onAdd({
      id: `custom/${slug || Date.now()}`,
      name: name.trim(),
      provider: "Custom",
      input: i,
      output: o,
      cachedInput: cached.trim() ? Number(cached) : undefined,
      source: "custom",
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input className="field field-sans !py-2 !text-sm" placeholder="Model name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">In $/1M</span>
          <input className="field !py-2 !text-sm" type="number" min={0} step="any" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Cached</span>
          <input className="field !py-2 !text-sm" type="number" min={0} step="any" inputMode="decimal" value={cached} onChange={(e) => setCached(e.target.value)} placeholder="–" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Out $/1M</span>
          <input className="field !py-2 !text-sm" type="number" min={0} step="any" inputMode="decimal" value={output} onChange={(e) => setOutput(e.target.value)} required />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-accent">
          Add
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
