# LLM Costs

Compare what a prompt costs across LLM APIs: per call, per day, per month.
Paste the text or type token counts, pick models, share the link.

**Live:** https://llm-costs-app.vercel.app

- Runs entirely in your browser. No API keys, no accounts, no analytics.
- Prices refresh on load from [OpenRouter's public models API](https://openrouter.ai/api/v1/models), with a bundled snapshot as fallback.
- Token counts for pasted text use the `o200k` tokenizer (OpenAI's current encoding) and are an estimate for other providers.
- Prompt-cache share, calls per day, presets for common workloads, custom models, shareable URL.

## How prices work

`src/data/models.json` is a curated snapshot of the models most people compare, with each provider's **direct API list price** checked by hand against the official pricing pages linked in the file. A weekly GitHub Action refreshes it from OpenRouter so it doesn't rot. Rows marked `"pin": true` (DeepSeek, Llama) are left alone, because OpenRouter serves those through third-party hosts at different rates.

At runtime the app fetches OpenRouter's catalog and overlays live prices on the snapshot. When a live price drifts more than 15% from the snapshot, the row shows a **Δ** marker. That usually means one of two things:

- the provider changed its price and the snapshot is behind (the Action will catch up), or
- OpenRouter routes that model through a third-party host with different rates (common for open-weights models and DeepSeek).

Any model in OpenRouter's catalog can be added from the search box, not just the curated ones.

Prices exclude batch, flex and priority tiers, long-context surcharges and cache-storage fees; notes on each row call out the ones that matter.

## Develop

```bash
pnpm install
pnpm dev
```

`pnpm build` runs the type checker and produces a static site in `dist/`. Deploy anywhere static files are served; it is set up for Vercel with zero configuration.

To refresh the snapshot by hand:

```bash
node scripts/update-snapshot.mjs
```

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · gpt-tokenizer

## License

MIT
