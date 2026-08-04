# AI++

**The programming language of the future.** Every `"double-quoted expression"` is evaluated by a local LLM. Everything else — variables, loops, functions, input — is ordinary deterministic code. There are **no syntax errors**: anything that isn't a structure is just text, and text gets printed.

```aipp
pres = "pick a random US president"
name = input(what is your name?)

Consulting $pres...
"Write a one sentence greeting to $name, spoken by $pres in their style"
"What year did $pres take office?" 'respond with only the year'
```

```
what is your name? Eric
Consulting Abraham Lincoln...
Well met, Eric — four score and seven greetings to you.
1861
```

Runs entirely on your machine. No API keys, no cloud, no cost — just [Ollama](https://ollama.com) and a small local model. The nondeterminism is the fun.

## Install

You need [Node.js](https://nodejs.org) ≥ 18 and [Ollama](https://ollama.com).

```sh
ollama pull hermes3:3b        # the default model, ~2 GB
git clone https://github.com/ericbajema/aipp
cd aipp
npm install                   # builds automatically
npm link                      # puts `aipp` on your PATH

aipp examples/genie.aipp      # play a game against the number genie
```

Ollama usually runs as a service after install; if not, start it with `ollama serve`.

## The language in five bullets

- `"quoted text"` is sent to the AI and replaced by its answer. Follow it with `'single quotes'` to override the AI's system prompt for that one call.
- `$var` interpolates anywhere, `x = value` assigns (spaces required — `x=value` is just text), `input(ask something)` prompts the user, even mid-sentence.
- `while: the story has a happy ending` — loop conditions are judged true/false by the AI. `if:` / `elif:` / `else:` too. `count(i): 1..10` loops are ordinary and deterministic.
- `name(params):` defines a function; its body runs silently and returns its last line.
- Nothing is ever a syntax error. A structure needs its indented body; anything else is prose, and prose prints.

The full language guide, with examples for every feature, is in [LANGUAGE.md](LANGUAGE.md).

## Examples

| File | What it shows |
|---|---|
| [`examples/deterministic.aipp`](examples/deterministic.aipp) | Every non-AI feature; stable output |
| [`examples/president.aipp`](examples/president.aipp) | AI calls, interpolation, custom system prompts |
| [`examples/conditional.aipp`](examples/conditional.aipp) | AI-judged if/elif/else |
| [`examples/genie.aipp`](examples/genie.aipp) | A guessing game the AI plays against you |

## Configuration

Run `aipp init` to drop a fully-commented `aipp.toml` into your project:

```toml
# model = "hermes3:3b"
# host = "http://localhost:11434"
# temperature = 0.8

# [prompts]
# main = ''' ... the default system prompt, uncomment and edit ... '''
# bool = ''' ... the true/false judge prompt ... '''
```

Everything is optional. The file is found by walking up from the script's directory, so one config covers a whole project. Precedence: CLI flag (`--model`, `--host`) > env (`AIPP_MODEL`, `AIPP_HOST`) > `aipp.toml` > defaults.

Two things to know:

- `while`/`if` conditions always run at temperature 0, so the same condition gets the same verdict. `temperature` only affects `"quoted"` calls.
- The default prompts are empirically tuned for small models. Rewrites that look smarter often score worse — measure over many runs before trusting one.

## VS Code

Syntax highlighting plus a run button:

```sh
code --install-extension editor/vscode/aipp-lang-0.1.0.vsix
```

No `code` command? Copy `editor/vscode/` to `~/.vscode/extensions/aipp-lang-0.1.0` and restart VS Code.

## FAQ

**Why does my program behave differently each run?** That's the language working as intended.

**Can it fail to parse?** No. Every file is a valid AI++ program. Some are just more interesting than others.

**Is `$var` injection dangerous?** No — interpolated values are inserted as inert text and never re-scanned, so user input can't smuggle in AI calls or structures.

**Does it work with bigger models?** Yes — set `model` in `aipp.toml` to anything Ollama can run. Bigger models make wilder programs possible; the examples are tuned to work even on a 3B model.

## Contributing

Pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the handful of invariants that are deliberate. Security issues go through [private reporting](https://github.com/ericbajema/aipp/security/advisories/new), not the issue tracker; [SECURITY.md](SECURITY.md) also explains what an `.aipp` file can do to your machine, which is worth reading before you run one you didn't write.

## License

[MIT](LICENSE)
