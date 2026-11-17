import { useMemo, useState, type FormEvent } from "react";
import { fmtRate } from "../lib/cost";
import type { Catalog, Model } from "../lib/pricing";

type Props = {
  catalog: Catalog;
  custom: Model[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAddCustom: (m: Model) => void;
  onRemoveCustom: (id: string) => void;
};

export function ModelPicker({ catalog, custom, selected, onToggle, onAddCustom, onRemoveCustom }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const featuredByProvider = useMemo(() => group(catalog.featured), [catalog.featured]);

  const searchResults = useMemo(() => {
    if (!q) return [];
    const terms = q.split(/\s+/);
    return [...catalog.all.values()]
      .filter((m) => {
        const hay = `${m.name} ${m.provider} ${m.id}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [catalog.all, q]);

  return (
    <section aria-labelledby="models-title" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="models-title" className="label">
            Models
          </h2>
          <p className="mt-1 text-sm text-muted">
            {selected.size} selected · {catalog.all.size} available
            {catalog.status === "live" ? " from OpenRouter's live catalog" : " in the bundled snapshot"}
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={catalog.status === "live" ? "Search any model… (grok, qwen, mistral)" : "Search…"}
          aria-label="Search models"
          className="field max-w-xs !text-[0.9375rem]"
          style={{ fontFamily: "var(--font-sans)" }}
        />
      </div>

      {q ? (
        <div>
          <p className="label mb-3">{searchResults.length === 0 ? "No matches" : `${searchResults.length} match${searchResults.length === 1 ? "" : "es"}`}</p>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((m) => (
              <Row key={m.id} m={m} checked={selected.has(m.id)} onToggle={onToggle} showProvider />
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {featuredByProvider.map(([provider, models]) => (
            <div key={provider}>
              <p className="label mb-3">{provider}</p>
              <ul>
                {models.map((m) => (
                  <Row key={m.id} m={m} checked={selected.has(m.id)} onToggle={onToggle} />
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="label mb-3">Custom</p>
            <ul>
              {custom.map((m) => (
                <Row key={m.id} m={m} checked={selected.has(m.id)} onToggle={onToggle} onRemove={() => onRemoveCustom(m.id)} />
              ))}
            </ul>
            <CustomForm onAdd={onAddCustom} />
          </div>
        </div>
      )}
    </section>
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

function Row({ m, checked, onToggle, showProvider, onRemove }: { m: Model; checked: boolean; onToggle: (id: string) => void; showProvider?: boolean; onRemove?: () => void }) {
  return (
    <li className="flex items-center gap-3 border-b border-rule py-2.5">
      <input id={`m-${m.id}`} type="checkbox" className="box" checked={checked} onChange={() => onToggle(m.id)} />
      <label htmlFor={`m-${m.id}`} className="flex min-w-0 flex-1 cursor-pointer items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[0.9375rem]">
          {m.name}
          {showProvider ? <span className="label ml-2">{m.provider}</span> : null}
        </span>
        <span className="num shrink-0 text-[0.75rem] text-faint">
          {fmtRate(m.input)} / {fmtRate(m.output)}
        </span>
      </label>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="label link text-faint hover:text-fg" aria-label={`Delete ${m.name}`}>
          ×
        </button>
      ) : null}
    </li>
  );
}

function CustomForm({ onAdd }: { onAdd: (m: Model) => void }) {
  const [open, setOpen] = useState(false);
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
    setName("");
    setInput("");
    setCached("");
    setOutput("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="label link mt-3 text-muted hover:text-fg" onClick={() => setOpen(true)}>
        + Add a model
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      <input className="field !text-[0.9375rem]" style={{ fontFamily: "var(--font-sans)" }} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="label">In $/1M</span>
          <input className="field mt-1 !text-[0.9375rem]" type="number" min={0} step="any" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">Cached</span>
          <input className="field mt-1 !text-[0.9375rem]" type="number" min={0} step="any" inputMode="decimal" value={cached} onChange={(e) => setCached(e.target.value)} placeholder="–" />
        </label>
        <label className="block">
          <span className="label">Out $/1M</span>
          <input className="field mt-1 !text-[0.9375rem]" type="number" min={0} step="any" inputMode="decimal" value={output} onChange={(e) => setOutput(e.target.value)} required />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-accent">
          Add
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
