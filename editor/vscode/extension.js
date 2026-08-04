const vscode = require('vscode');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aipp.runFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const doc = editor.document;
      if (doc.isUntitled) {
        vscode.window.showErrorMessage('Save the file first, then run it with AI++.');
        return;
      }
      if (doc.isDirty) await doc.save();
      let terminal = vscode.window.terminals.find((t) => t.name === 'AI++');
      if (!terminal) terminal = vscode.window.createTerminal('AI++');
      terminal.show();
      // Quoted for paths with spaces. Uses the global `aipp` from `npm link`;
      // if you skipped linking, run `node dist/cli.js <file>` yourself instead.
      terminal.sendText(`aipp "${doc.fileName}"`);
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
