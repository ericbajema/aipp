# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI++ is an esoteric programming language where every double-quoted expression is evaluated by a local LLM (Ollama) and everything else — variables, loops, functions, if-chains, input — is deterministic interpreter code. **`AI++.md` is the authoritative language spec.** Any change to syntax or semantics must be reflected there, and the spec's commented example code doubles as the language reference.

## Commands

```
npm run build              # tsc → dist/ (no lint, no test suite)
node dist/cli.js <file>    # run an AI++ script (or the global `aipp <file>`)
aipp <file> -m <model>     # model override; env: AIPP_MODEL, AIPP_HOST
```

- Requires Ollama running on localhost:11434 (`ollama serve`). Default model: `hermes3:3b`.
- No test suite. Test by running scripts in `examples/`: `deterministic.aipp` exercises the non-AI features and should produce stable output; the others make AI calls and are nondeterministic by design.
- For repeatable testing of AI behavior, write a throwaway harness that imports `dist/ai.js` directly (or spawns `dist/cli.js` and scripts stdin) and measures pass rates over many samples — single runs prove nothing with a 3B model.

## Architecture

Pipeline: `src/cli.ts` (arg parsing) → `src/parser.ts` → `src/interpreter.ts`, with `src/ai.ts` (Ollama) and `src/input.ts` (readline) as the interpreter's two effect handlers.

**parser.ts** — line-oriented, indentation-blocked (tabs or 4 spaces = 1 level). Builds a block tree of nodes: `line`, `funcdef`, `while`, `count`, `if`. Core invariant: **there are no syntax errors** — anything that doesn't match a structure is kept as a plain line. A structure header (`while: cond`, `while(limit): cond`, `count(i): a..b`, `count: n`, `if:`/`elif:`/`else:`, `name(params):`) only becomes a structure when an indented body follows it; otherwise it's just text. Conditions may be wrapped in optional double quotes and followed by an optional `'custom bool system prompt'` — both are peeled off at parse time (`parseCondition`).

**interpreter.ts** — tree-walking evaluator. `evalText()` is the heart of the language: a single left-to-right scan resolving `\` escapes, `$var` interpolation (count-loop counters shadow ordinary variables), inline `input(...)` prompts, and `"expr"` AI calls with an optional `'system prompt'` immediately after. Interpolated values are appended to output, never rescanned — this makes the language injection-safe by construction; preserve that property. Other invariants:
- Assignment requires spaces around `=` (`x = v`); `x=v` is just text.
- Dynamic scope: one global variable pool; function params shadow it during the call and are restored after.
- Function bodies run silent; only the last line's value returns/prints.
- Builtins (`print`, `sleep`, `read`, `write`, `exit`) are overridable by user functions and called as `name(args)` whole-line or whole-RHS. `input` is deliberately NOT in `BUILTINS`: it's handled inline by `evalText` so it works mid-text and its prompt can contain commas (a user-defined `input()` function still wins). `exit()` throws `ExitSignal`, caught in `run()`.
- Nothing ever throws to the user — file errors return `''`, unknown `$var` stays literal.

**ai.ts** — two entry points: `ask(prompt, system?)` for `"expr"` (default temperature), and `evalCondition(cond, system?)` for while/if conditions, which uses Ollama structured output forcing `{reasoning, answer}` JSON at temperature 0 (a `'custom system prompt'` on the condition replaces `BOOL_SYSTEM` but keeps the schema). The `reasoning` field comes *before* `answer` deliberately (chain-of-thought before committing) — don't remove it. Both use `keep_alive: '15m'`.

**input.ts** — readline wrapper. Prompts must go through `rl.setPrompt()`/`rl.prompt()`, never raw `stdout.write`, or any backspace/arrow keypress redraws the line as `> ` and the question vanishes. Piped stdin is queued and echoed so transcripts read correctly.

## Working with the small model

The default 3B model shapes how example programs and system prompts must be written:

- The `MAIN_SYSTEM` / `BOOL_SYSTEM` prompts in `ai.ts` are empirically tuned (few-shot format, "letter for letter" word equality, no double-framing wrapper). Don't rewrite them on intuition — measure variants with a harness over 20+ samples first. Counterintuitive findings that held: more few-shot examples can hurt; adding extra context (e.g. the guess number) hurt; `"reply" -> label` arrow examples beat prose phrasing.
- Known model ceilings (not fixable by prompting): inverting comparative statements ("that is bigger than my number" → number is smaller) tops out ~85%; arithmetic on narrow ranges is unreliable.
- When writing example programs, use the classify-then-branch pattern: one AI call with a custom system prompt reduces freeform input to a single word, then branch on plain word equality (`if: $direction = correct`), which the judge handles ~100% reliably. Several independent AI-judged yes/no branch conditions are near coin-flip. See `examples/genie.aipp`.
