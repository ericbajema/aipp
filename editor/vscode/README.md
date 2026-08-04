# AI++ for VS Code

Syntax highlighting, `#` comment toggling, auto-indent after structure headers, and an **AI++: Run File** button for `.aipp` files.

AI++ has no syntax errors — anything that isn't a structure is text that gets printed — so this extension only colors, it never complains.

Install from the repo root:

```
code --install-extension editor/vscode/aipp-lang-0.1.0.vsix
```

The run button executes `aipp <file>` in a terminal, so install the language first (see the [main README](../../README.md)).
