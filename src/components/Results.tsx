import { useState } from "react";
import { fmtInt, fmtRate, fmtUSD, type CostRow, type Inputs } from "../lib/cost";
import { hasDrift } from "../lib/pricing";

type Props = { rows: CostRow[]; inputs: Inputs; onRemove: (id: string) => void };

export function Results({ rows, inputs, onRemove }: Props) {
  const [copied, setCopied] = useState(false);
  const max = rows.reduce((m, r) => Math.max(m, r.perCall), 0);

  const copy = () => {
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <section aria-labelledby="results-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="results-title" className="label">
            Cost
          </h2>
          <p className="mt-1 text-sm text-muted">
            {fmtInt(inputs.inputTokens)} in · {fmtInt(inputs.outputTokens)} out · {fmtInt(inputs.callsPerDay)} calls/day
            {inputs.cachedShare > 0 ? ` · ${Math.round(inputs.cachedShare * 100)}% cached` : ""}
            <span className="text-faint"> · rates shown as in · cached · out, $/1M</span>
          </p>
        </div>
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Link copied ✓" : "Copy link"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">Pick at least one model below.</p>
      ) : (
        <ol className="mt-6 border-t border-rule">
          {rows.map((r, i) => (
            <li
              key={r.model.id}
              className="rise grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-2 border-b border-rule py-4 md:grid-cols-[minmax(0,2.1fr)_repeat(3,minmax(0,1fr))_auto] md:items-center"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="display truncate text-[1.0625rem] font-medium">{r.model.name}</span>
                  <span className="label truncate">{r.model.provider}</span>
                  {hasDrift(r.model) ? (
                    <span
                      className="label text-accent"
                      title={`Live price differs from the provider's list price in our snapshot (${fmtRate(r.model.snapshot!.input)} / ${fmtRate(r.model.snapshot!.output)}).`}
                    >
                      Δ
                    </span>
                  ) : null}
                </div>
                <p
                  className="num mt-1 whitespace-nowrap text-[0.8125rem] text-muted"
                  title="Price per 1M tokens: input · cached input · output"
                >
                  {fmtRate(r.model.input)} · {r.model.cachedInput !== undefined ? fmtRate(r.model.cachedInput) : "–"} · {fmtRate(r.model.output)}
                  <span className="text-faint"> /1M</span>
                </p>
                <div className="mt-3 h-1 w-full rounded bg-bg-2">
                  <div className="bar" style={{ width: `${max > 0 ? Math.max(1, (r.perCall / max) * 100) : 0}%` }} />
                </div>
                {r.model.note ? <p className="mt-2 text-[0.75rem] leading-snug text-faint">{r.model.note}</p> : null}
              </div>

              <button
                type="button"
                onClick={() => onRemove(r.model.id)}
                className="label link row-start-1 text-faint hover:text-fg md:col-start-5"
                aria-label={`Remove ${r.model.name}`}
              >
                Remove
              </button>

              <Stat label="per call" value={fmtUSD(r.perCall)} className="col-span-2 md:col-span-1" />
              <Stat label="per day" value={fmtUSD(r.perDay)} className="hidden md:block" />
              <Stat label="per month" value={fmtUSD(r.perMonth)} strong className="hidden md:block" />
              <p className="num col-span-2 -mt-1 text-[0.8125rem] text-muted md:hidden">
                {fmtUSD(r.perDay)} / day · <span className="text-fg">{fmtUSD(r.perMonth)} / month</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Stat({ label, value, strong, className = "" }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={className}>
      <span className="label block">{label}</span>
      <span className={`num block text-[1.125rem] md:text-[1.25rem] ${strong ? "text-fg" : "text-muted"}`}>{value}</span>
    </div>
  );
}
