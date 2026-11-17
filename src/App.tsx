import { useEffect, useMemo, useState } from "react";
import { Controls } from "./components/Controls";
import { Header, REPO_URL } from "./components/Header";
import { ModelsBar } from "./components/ModelsBar";
import { Priciest } from "./components/Priciest";
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

  const live = catalog.status === "live";

  return (
    <div className="mx-auto flex min-h-dvh max-w-[75rem] flex-col px-4 pb-16 sm:px-8">
      <Header />

      <section className="flex flex-col gap-3 pt-8 pb-7 md:pt-11 md:pb-9">
        <h1 className="display text-[clamp(1.875rem,4.5vw,2.5rem)] font-semibold leading-[1.05]">What does that prompt cost?</h1>
        <p className="max-w-[60ch] text-[0.9375rem] text-muted md:text-base">
          Type token counts or paste the text, pick the models you're weighing, and see the bill per call, per day and per month. Runs
          in your browser, no keys.
        </p>
      </section>

      <div className="flex flex-wrap items-start gap-8">
        <aside className="min-w-[17.5rem] flex-[0_1_22rem] lg:sticky lg:top-6">
          <Controls inputs={inputs} onChange={setInputs} />
        </aside>
        <main className="flex min-w-0 flex-[1_1_35rem] flex-col gap-7">
          <ModelsBar
            catalog={catalog}
            custom={custom}
            selected={selected}
            onToggle={toggle}
            onAddCustom={addCustom}
            onRemoveCustom={removeCustom}
          />
          <Results rows={rows} inputs={inputs} />
        </main>
      </div>

      <Priciest catalog={catalog} inputs={inputs} selected={selectedSet} onToggle={toggle} />

      <footer className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-rule pt-6 text-[0.8125rem] leading-relaxed text-muted">
        <p className="max-w-[70ch] flex-[1_1_30rem]">
          USD per million tokens at each provider's standard tier, excluding batch, flex and priority rates, long-context surcharges and
          cache-storage fees.{" "}
          {live ? (
            <>
              Live rates come from{" "}
              <a className="link" href="https://openrouter.ai/models" target="_blank" rel="noreferrer">
                OpenRouter
              </a>{" "}
              and refresh hourly in your browser; the bundled snapshot was checked on {SNAPSHOT_DATE} and rows marked Δ differ from it.
            </>
          ) : (
            <>Prices are the bundled snapshot checked on {SNAPSHOT_DATE}; live rates from OpenRouter were not reachable.</>
          )}{" "}
          Verify against{" "}
          {SOURCES.filter((s) => !s.label.includes("OpenRouter")).map((s, i, arr) => (
            <span key={s.url}>
              <a className="link" href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
              {i < arr.length - 1 ? ", " : " before budgeting."}
            </span>
          ))}
        </p>
        <p className="flex-[0_1_20rem]">
          Open source under MIT ·{" "}
          <a className="link" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          ·{" "}
          <a className="link" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            Report a wrong price
          </a>
          <br />
          Made by{" "}
          <a className="link" href="https://github.com/emmanuelmuniz" target="_blank" rel="noreferrer">
            Emmanuel Muñiz Adaro
          </a>
        </p>
      </footer>
    </div>
  );
}
