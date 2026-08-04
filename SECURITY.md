# Security Policy

AI++ is a hobby language, but it runs code on your machine and talks to a model, so there is a real surface here. This page says what it is and how to tell me about problems.

## Reporting a vulnerability

Use GitHub's private reporting form: **[Report a vulnerability](https://github.com/ericbajema/aipp/security/advisories/new)**. It's private — only I can see it.

Please don't open a public issue for anything that could be used against someone before it's fixed.

Include the `.aipp` file (or the smallest version that still shows the problem), the model and Ollama version you ran it with, and what you expected to happen instead. I'll respond when I can — this is a side project, not a product with an on-call rotation.

Supported version: whatever is on `main`. There are no backports.

## What AI++ actually does to your machine

Worth knowing before you run someone else's script:

- **An `.aipp` file is executable code.** `write(path, text)` writes anywhere your user account can write, `read(path)` reads anything it can read, and `sleep()` can stall indefinitely. Treat a downloaded `.aipp` file exactly like a downloaded shell script.
- **AI output can reach the filesystem.** Interpolation is safe from *language* injection — a `$var` or `input()` value is inserted as inert text and never re-scanned, so it can't smuggle in AI calls or structures. But nothing stops you from writing `write("pick a filename", $data)`, and then the model chooses the path. If model output flows into `read`/`write`, that's a decision you made.
- **Prompts go wherever `host` points.** By default that's `http://localhost:11434` and nothing leaves your machine. Change `host` in `aipp.toml` (or `AIPP_HOST`) to a remote address and every prompt, including interpolated file contents and user input, goes to that server.
- **`aipp.toml` is found by walking up the directory tree** from the script. Running a script inside a folder someone else prepared means their config — their model, their host, their system prompts — is what runs.
- **There is no sandbox.** The interpreter never throws to the user by design; unknown variables stay literal, missing files read as empty. That's a usability choice, not a containment boundary.

None of that is a bug report on its own. Things I *would* like to hear about: a way to make `$var` or `input()` values get re-scanned as code, a way for a `.aipp` file to reach outside what the interpreter documents, or anything in the toolchain that executes content it shouldn't.
