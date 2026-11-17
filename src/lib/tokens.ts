let counter: Promise<(text: string) => number> | null = null;

/** Lazy-loads the o200k tokenizer (used by recent OpenAI models). Other providers tokenize differently, so treat the count as an estimate. */
export function countTokens(text: string): Promise<number> {
  counter ??= import("gpt-tokenizer/encoding/o200k_base").then((m) => m.countTokens);
  return counter.then((f) => f(text));
}
