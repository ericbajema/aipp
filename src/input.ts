import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

// Buffers stdin lines so piped input works: lines that arrive before a
// ! prompt asks for them are queued instead of lost, and reading past
// end-of-input just returns "" (no errors in this language).
export class Input {
  private rl: readline.Interface;
  private queue: string[] = [];
  private waiting: Array<(line: string) => void> = [];
  private closed = false;

  constructor() {
    this.rl = readline.createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
    this.rl.on('line', (line) => {
      const waiter = this.waiting.shift();
      if (waiter) waiter(line);
      else this.queue.push(line);
    });
    this.rl.on('close', () => {
      this.closed = true;
      for (const waiter of this.waiting.splice(0)) waiter('');
    });
  }

  question(prompt: string): Promise<string> {
    if (this.queue.length > 0) {
      stdout.write(prompt);
      const line = this.queue.shift()!;
      stdout.write(line + '\n'); // echo piped input so the transcript reads right
      return Promise.resolve(line);
    }
    if (this.closed) {
      stdout.write(prompt + '\n');
      return Promise.resolve('');
    }
    // Register the prompt with readline (not a bare stdout.write) so that
    // when the user hits backspace or an arrow key, readline redraws the
    // line with the question instead of its default "> ".
    this.rl.setPrompt(prompt);
    this.rl.prompt();
    return new Promise((resolve) => {
      this.waiting.push((line) => {
        this.rl.setPrompt('');
        resolve(line);
      });
    });
  }

  close(): void {
    this.rl.close();
  }
}
