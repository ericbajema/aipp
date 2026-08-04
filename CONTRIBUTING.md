# Contributing

Contributions are welcome. This is a small, opinionated project — the fastest path to a merged PR is knowing which parts are load-bearing.

## How to submit a change

`main` is protected, so nobody pushes to it directly (including me, for force-pushes and deletions). The flow is:

1. Fork the repo, branch off `main`.
2. Make the change.
3. Open a pull request against `main`. I review and merge.

Open an issue first if the change is large or changes the language — better to agree on the idea before you write it.

## Local setup

```sh
ollama pull hermes3:3b        # the default model
npm install                   # builds automatically via `prepare`
npm link                      # puts `aipp` on your PATH
```

## Before you open a PR

There's no test suite. In its place:

- `npm run build` compiles clean.
- `node dist/cli.js examples/deterministic.aipp` produces the same output as before your change. This example exercises every non-AI feature and is the closest thing to a regression test.
- The AI examples (`president`, `conditional`, `genie`) still run start to finish. Their output is nondeterministic by design — you're checking that nothing hangs or crashes, not that the text matches.

Say in the PR what you ran.

## Things that are deliberate

Please don't change these without making the case in your PR:

- **There are no syntax errors.** Anything that isn't a recognized structure is text, and text prints. A structure only becomes a structure when an indented body follows it. Never add a code path that rejects a file.
- **Nothing throws to the user.** Missing files read as empty, unknown `$var` stays literal, broken config warns once and carries on.
- **Interpolation is injection-safe.** Interpolated values are appended to output and never re-scanned. This property is what makes user input safe to feed into prompts — preserve it.
- **`while`/`if` conditions always run at temperature 0.** Same condition, same state, same verdict. Temperature is configurable for `"quoted"` calls only.
- **The default system prompts in `src/ai.ts` are empirically tuned for small models.** They look strange because measured variants that looked smarter scored worse. If you want to change them, measure both versions over 20+ samples and put the numbers in the PR — a single good run proves nothing with a 3B model.

## If you change the language

Two things must move with it:

- **`LANGUAGE.md`** is the authoritative reference. Syntax or semantic changes land there in the same PR, and its examples show real code with its real output — run them.
- **The VS Code grammar** (`editor/vscode/syntaxes/aipp.tmLanguage.json`) deliberately mirrors the parser's regexes. If you touch `WHILE_RE`/`COUNT_RE`/`FUNC_RE`/`ASSIGN_RE`/`stripComment`/`parseCondition`, update the grammar too and repackage:

  ```sh
  cd editor/vscode && npx @vscode/vsce package
  ```

  Commit the new `.vsix`. The grammar never marks anything as an error — there are none.

## Bug reports

Include the `.aipp` file, the model you ran it with, what you expected, and what happened. If it's an AI-behavior complaint ("the model got the answer wrong"), that may just be the language working as intended — say how often it happens.

Found a security issue? Don't open an issue — see [SECURITY.md](SECURITY.md).
