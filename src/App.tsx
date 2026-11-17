import { useEffect, useMemo, useState } from "react";
import { Controls } from "./components/Controls";
import { Header, REPO_URL } from "./components/Header";
import { ModelPicker } from "./components/ModelPicker";
import { Results } from "./components/Results";
import { computeRows, type Inputs } from "./lib/cost";
import { loadCatalog, snapshotCatalog, SNAPSHOT_DATE, SOURCES, type Catalog, type Model } from "./lib/pricing";
import { readUrl, writeUrl } from "./lib/url";

const DEFAULT_SELECTED = [
  "openai/gpt-6.1-sol",
  "openai/gpt-6-luna",
  "anthropic/claude-opus-5.5",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-haiku-5.5",
  "google/gemini-4-carbon",
  "google/gemini-3.8-flash",
  "deepseek/deepseek-v4.1-flash",
];

const CUSTOM_KEY = "llm-costs:custom:v1";

function readCustom(): Model[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Model[]) : [];
  } catch {
    return [];
  }
}

export function App() {
  const [initial] = useState(readUrl);
  const [inputs, setInputs] = useState<Inputs>(initial.inputs);
  const [selected, setSelected] = useState<string[]>(initial.selected ?? DEFAULT_SELECTED);
  const [catalog, setCatalog] = useState<Catalog>(snapshotCatalog);
  const [custom, setCustom] = useState<Model[]>(readCustom);

  useEffect(() => {
    let alive = true;
    loadCatalog().then((c) => {
      if (alive) setCatalog(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    writeUrl(inputs, selected);
  }, [inputs, selected]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    } catch {
      /* ignore */
    }
  }, [custom]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const rows = useMemo(() => {
    const customById = new Map(custom.map((m) => [m.id, m]));
    const models = selected
      .map((id) => catalog.all.get(id) ?? customById.get(id))
      .filter((m): m is Model => m !== undefined);
    return computeRows(models, inputs);
  }, [selected, catalog, custom, inputs]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addCustom = (m: Model) => {
    setCustom((c) => [...c.filter((x) => x.id !== m.id), m]);
    setSelected((s) => (s.includes(m.id) ? s : [...s, m.id]));
  };
  const removeCustom = (id: string) => {
    setCustom((c) => c.filter((x) => x.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[80rem] flex-col px-5 pt-5 pb-16 sm:px-8">
      <Header catalog={catalog} />

      <section className="pt-14 pb-12 md:pt-20 md:pb-16">
        <h1 className="display max-w-[22ch] text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
          What does that prompt <span className="text-accent">cost</span>?
        </h1>
        <p className="mt-6 max-w-[48ch] text-[1.0625rem] leading-relaxed text-muted md:text-[1.125rem]">
          Paste the text or type token counts, pick the models you're weighing, and see the bill per call, per day and per month.
          Everything runs in your browser.
        </p>
      </section>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-6">
            <Controls inputs={inputs} onChange={setInputs} />
          </div>
        </aside>
        <main className="lg:col-span-8">
          <Results rows={rows} inputs={inputs} onRemove={toggle} />
        </main>
      </div>

      <div className="mt-20 border-t border-rule pt-12 md:mt-28">
        <ModelPicker
          catalog={catalog}
          custom={custom}
          selected={selectedSet}
          onToggle={toggle}
          onAddCustom={addCustom}
          onRemoveCustom={removeCustom}
        />
      </div>

      <footer className="mt-20 grid gap-6 border-t border-rule pt-8 text-[0.8125rem] leading-relaxed text-muted md:grid-cols-12 md:mt-28">
        <p className="md:col-span-7">
          Prices are USD per million tokens at each provider's standard tier, excluding batch, flex and priority rates, long-context
          surcharges and cache-storage fees. Live prices come from{" "}
          <a className="link" href="https://openrouter.ai/models" target="_blank" rel="noreferrer">
            OpenRouter
          </a>
          , which mirrors most providers' list prices but hosts some models through third parties; the Δ marker flags rows that drift
          from the snapshot checked on {SNAPSHOT_DATE}. Verify against the official pages before budgeting:{" "}
          {SOURCES.filter((s) => !s.label.includes("OpenRouter")).map((s, i, arr) => (
            <span key={s.url}>
              <a className="link" href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
              {i < arr.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
        <p className="md:col-span-4 md:col-start-9">
          Open source under MIT.{" "}
          <a className="link" href={REPO_URL} target="_blank" rel="noreferrer">
            Code on GitHub
          </a>
          . Spotted a wrong price?{" "}
          <a className="link" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            Open an issue
          </a>
          . Made by{" "}
          <a className="link" href="https://github.com/emmanuelmuniz" target="_blank" rel="noreferrer">
            Emmanuel Muñiz Adaro
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
