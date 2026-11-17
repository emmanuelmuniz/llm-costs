import { useTheme } from "../lib/theme";

export const REPO_URL = "https://github.com/emmanuelmuniz/llm-costs";

export function Header() {
  const [theme, toggle] = useTheme();

  return (
    <header className="flex h-16 items-center justify-between gap-6 border-b border-rule">
      <a href="/" className="text-[1.0625rem] font-semibold tracking-[-0.01em]">
        LLM Costs
      </a>
      <nav className="flex items-center gap-6 text-sm">
        <a href={REPO_URL} className="quiet" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <button
          type="button"
          onClick={toggle}
          className="quiet cursor-pointer"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </nav>
    </header>
  );
}
