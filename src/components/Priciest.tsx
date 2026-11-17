import { useMemo } from "react";
import { computeRows, fmtRate, fmtUSD, type Inputs } from "../lib/cost";
import type { Catalog } from "../lib/pricing";

type Props = { catalog: Catalog; inputs: Inputs; selected: Set<string>; onToggle: (id: string) => void };

/** The ten most expensive models in the whole catalog for the current prompt shape. */
export function Priciest({ catalog, inputs, selected, onToggle }: Props) {
  const rows = useMemo(() => computeRows([...catalog.all.values()], inputs).slice(-10).reverse(), [catalog, inputs]);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="priciest-title" className="mt-16 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="priciest-title" className="text-[0.9375rem] font-semibold">
          The ten most expensive
        </h2>
        <p className="text-[0.8125rem] text-muted">
          Out of {catalog.all.size} models {catalog.status === "live" ? "on OpenRouter" : "in the snapshot"}, for this prompt and volume.
        </p>
      </div>
      <ol className="card overflow-hidden">
        {rows.map((r, i) => {
          const on = selected.has(r.model.id);
          return (
            <li
              key={r.model.id}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-rule px-4 py-3 last:border-b-0 md:grid-cols-[1.5rem_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:px-5"
            >
              <span className="num text-[0.75rem] text-faint">{i + 1}</span>
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{r.model.name}</span>
                <span className="text-[0.75rem] text-faint">{r.model.provider}</span>
              </span>
              <span className="num col-start-2 text-[0.75rem] text-muted md:col-start-auto">
                <span className="inline-block">
                  <span className="text-faint">input </span>
                  {fmtRate(r.model.input)}
                </span>{" "}
                <span className="inline-block">
                  <span className="text-faint">· output </span>
                  {fmtRate(r.model.output)}
                </span>{" "}
                <span className="inline-block text-faint">· per 1M tokens</span>
              </span>
              <span className="num col-start-2 text-[0.8125rem] md:col-start-auto md:text-right md:text-[0.9375rem] md:font-medium">
                {fmtUSD(r.perMonth)}
                <span className="text-[0.6875rem] font-normal text-faint">/mo</span>
              </span>
              <button
                type="button"
                onClick={() => onToggle(r.model.id)}
                aria-pressed={on}
                className="btn col-start-3 row-start-1 !px-2.5 !py-1.5 text-[0.75rem] md:col-start-auto md:row-start-auto"
              >
                {on ? "Remove" : "Compare"}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
