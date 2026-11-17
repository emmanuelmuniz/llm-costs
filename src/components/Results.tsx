import { useState } from "react";
import { fmtInt, fmtPct, fmtRate, fmtUSD, outputShare, type CostRow, type Inputs } from "../lib/cost";
import { hasDrift } from "../lib/pricing";

type Props = { rows: CostRow[]; inputs: Inputs };

const GRID = "md:grid-cols-[minmax(0,2.6fr)_repeat(3,minmax(5rem,1fr))]";

export function Results({ rows, inputs }: Props) {
  const [copied, setCopied] = useState(false);
  const max = rows.reduce((m, r) => Math.max(m, r.perCall), 0);

  const copy = () => {
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="results-title" className="text-[0.9375rem] font-semibold">
            Cost
          </h2>
          <p className="text-[0.8125rem] text-muted">
            {fmtInt(inputs.inputTokens)} input · {fmtInt(inputs.outputTokens)} output · {fmtInt(inputs.callsPerDay)} calls/day
            {inputs.cachedShare > 0 ? ` · ${Math.round(inputs.cachedShare * 100)}% cached` : ""} · cheapest first
          </p>
        </div>
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Link copied ✓" : "Copy link"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className={`th hidden gap-4 border-b border-rule px-5 py-2.5 md:grid ${GRID}`}>
          <span>Model · price per 1M tokens</span>
          <span className="text-right">Per call</span>
          <span className="text-right">Per day</span>
          <span className="text-right">Per month</span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-muted">Add at least one model above.</p>
        ) : (
          <ol>
            {rows.map((r, i) => (
              <li
                key={r.model.id}
                className={`rise grid grid-cols-1 gap-x-4 gap-y-2 border-b border-rule px-4 py-3.5 last:border-b-0 md:items-center md:px-5 ${GRID}`}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2 md:justify-start">
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{r.model.name}</span>
                      <span className="shrink-0 text-[0.75rem] text-faint">{r.model.provider}</span>
                      {hasDrift(r.model) ? (
                        <span
                          className="shrink-0 text-[0.6875rem] font-medium text-accent"
                          title={`Live price differs from the provider's list price in our snapshot (${fmtRate(r.model.snapshot!.input)} / ${fmtRate(r.model.snapshot!.output)}).`}
                        >
                          Δ live
                        </span>
                      ) : null}
                    </span>
                    <span className="num shrink-0 text-[0.9375rem] font-medium md:hidden">
                      {fmtUSD(r.perMonth)}
                      <span className="text-[0.6875rem] font-normal text-faint">/mo</span>
                    </span>
                  </div>
                  <div className="num flex flex-wrap justify-between gap-x-3 text-[0.75rem] text-muted md:block">
                    <span>
                      <Rate label="input" value={r.model.input} /> · <Rate label="cached" value={r.model.cachedInput} /> ·{" "}
                      <Rate label="output" value={r.model.output} /> <span className="text-faint md:hidden">· per 1M tokens</span>
                    </span>
                    <span className="md:hidden">
                      {fmtUSD(r.perCall)}/call · <Split r={r} inputs={inputs} />
                    </span>
                  </div>
                  <div className="h-[3px] w-full rounded-sm bg-track">
                    <div className="bar" style={{ width: `${max > 0 ? Math.max(1, (r.perCall / max) * 100) : 0}%` }} />
                  </div>
                  {r.model.note ? <p className="text-[0.75rem] leading-snug text-faint">{r.model.note}</p> : null}
                </div>

                <span className="num hidden flex-col items-end text-right md:flex">
                  <span className="text-[0.875rem] text-muted">{fmtUSD(r.perCall)}</span>
                  <span className="text-[0.6875rem] text-faint">
                    <Split r={r} inputs={inputs} />
                  </span>
                </span>
                <Cell value={fmtUSD(r.perDay)} />
                <Cell value={fmtUSD(r.perMonth)} strong />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Rate({ label, value }: { label: string; value: number | undefined }) {
  return (
    <span>
      <span className="text-faint">{label} </span>
      {value === undefined ? "–" : fmtRate(value)}
    </span>
  );
}

/** "input 0% · output 100%": which side of the call the money goes to. */
function Split({ r, inputs }: { r: CostRow; inputs: Inputs }) {
  const out = outputShare(r.model, inputs);
  return (
    <span title="Share of each call's cost that comes from input tokens vs the model's reply">
      <span className="inline-block">input {fmtPct(1 - out)}</span> <span className="inline-block">· output {fmtPct(out)}</span>
    </span>
  );
}

function Cell({ value, strong }: { value: string; strong?: boolean }) {
  return (
    <span className={`num hidden text-right md:block ${strong ? "text-[0.9375rem] font-medium" : "text-[0.875rem] text-muted"}`}>
      {value}
    </span>
  );
}
