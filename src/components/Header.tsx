import type { Catalog } from "../lib/pricing";
import { SNAPSHOT_DATE } from "../lib/pricing";
import { useTheme } from "../lib/theme";

export const REPO_URL = "https://github.com/emmanuelmuniz/llm-costs";

export function Header({ catalog }: { catalog: Catalog }) {
  const [theme, toggle] = useTheme();
  const live = catalog.status === "live";
  const fetched = catalog.fetchedAt
    ? new Date(catalog.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-rule pb-4">
      <a href="/" className="display text-lg font-semibold tracking-tight">
        LLM Costs<span className="text-accent">.</span>
      </a>
      <div className="flex items-center gap-4">
        <span className="label flex items-center gap-2" title={live ? "Prices refreshed from OpenRouter's public models API" : `Bundled snapshot from ${SNAPSHOT_DATE}`}>
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-accent" : "bg-faint"}`}
          />
          {live ? `Live prices${fetched ? ` · ${fetched}` : ""}` : `Snapshot · ${SNAPSHOT_DATE}`}
        </span>
        <a href={REPO_URL} className="label link hidden sm:inline" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <button
          type="button"
          onClick={toggle}
          className="label link"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}
