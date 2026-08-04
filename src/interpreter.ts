import * as fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { Node, Param, splitTopLevel } from './parser.js';
import { AI } from './ai.js';
import type { Input } from './input.js';

// x = value  — whitespace around = is what makes it an assignment
const ASSIGN_RE = /^([A-Za-z_][A-Za-z0-9_]*) +=(?: (.*))?$/s;
// name(args) — a call when it's the whole line (or the whole right side of =)
const CALL_RE = /^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)\s*$/;

// input is not here: it is handled inline by evalText so it can appear
// mid-text, and so its prompt can contain commas without being split.
const BUILTINS = new Set(['print', 'sleep', 'read', 'write', 'exit']);

// Thrown by exit() to unwind out of loops and functions; run() swallows it.
class ExitSignal {}

interface Func {
  params: Param[];
  body: Node[];
}

interface Counter {
  name: string;
  value: number;
}

export class Interpreter {
  private vars = new Map<string, string>();
  private funcs = new Map<string, Func>();
  private counters: Counter[] = []; // named count-loop variables, innermost last

  constructor(private ai: AI, private input: Input) {}

  async run(nodes: Node[]): Promise<void> {
    try {
      await this.execBlock(nodes, false);
    } catch (err) {
      if (!(err instanceof ExitSignal)) throw err; // exit() is a quiet, normal end
    }
  }

  // Runs a block; returns the value of its last line (a function's return value).
  private async execBlock(nodes: Node[], silent: boolean): Promise<string> {
    let last = '';
    for (const node of nodes) {
      last = await this.execNode(node, silent);
    }
    return last;
  }

  private async execNode(node: Node, silent: boolean): Promise<string> {
    switch (node.kind) {
      case 'funcdef':
        this.funcs.set(node.name, { params: node.params, body: node.body });
        return '';

      case 'count': {
        const step = node.from <= node.to ? 1 : -1;
        for (let v = node.from; step > 0 ? v <= node.to : v >= node.to; v += step) {
          if (node.varName) this.counters.push({ name: node.varName, value: v });
          try {
            await this.execBlock(node.body, silent);
          } finally {
            if (node.varName) this.counters.pop();
          }
        }
        return '';
      }

      case 'while': {
        for (let i = 0; i < node.limit; i++) {
          if (await this.evalCondition(node.cond, node.condSys)) break;
          await this.execBlock(node.body, silent);
        }
        return '';
      }

      case 'if': {
        for (const branch of node.branches) {
          const taken =
            branch.cond === null ||
            (await this.evalCondition(branch.cond, branch.condSys));
          if (taken) return this.execBlock(branch.body, silent);
        }
        return '';
      }

      case 'line':
        return this.execLine(node.text, silent);
    }
  }

  private async evalCondition(cond: string, condSys?: string): Promise<boolean> {
    const text = await this.evalText(cond);
    const sys = condSys !== undefined ? await this.evalText(condSys) : undefined;
    return this.ai.evalCondition(text, sys);
  }

  private async execLine(text: string, silent: boolean): Promise<string> {
    const assign = text.match(ASSIGN_RE);
    if (assign) {
      const rhs = assign[2] ?? '';
      this.vars.set(assign[1], await this.evalRhs(rhs));
      return ''; // assignment evaluates to nothing
    }

    const call = text.match(CALL_RE);
    if (call && this.isCallable(call[1])) {
      const value = await this.callFunction(call[1], call[2]);
      if (!silent && value !== '') console.log(value);
      return value;
    }

    const value = await this.evalText(text);
    if (!silent) console.log(value);
    return value;
  }

  // The right side of = : a function call stores its return value,
  // anything else is evaluated as text.
  private async evalRhs(rhs: string): Promise<string> {
    const call = rhs.trim().match(CALL_RE);
    if (call && this.isCallable(call[1])) {
      return this.callFunction(call[1], call[2]);
    }
    return this.evalText(rhs);
  }

  private isCallable(name: string): boolean {
    return this.funcs.has(name) || BUILTINS.has(name);
  }

  private async callFunction(name: string, rawArgs: string): Promise<string> {
    const args: string[] = [];
    if (rawArgs.trim() !== '') {
      for (const part of splitTopLevel(rawArgs)) {
        args.push(await this.evalText(part.trim()));
      }
    }

    // User-defined functions win — utility functions can be overwritten.
    const fn = this.funcs.get(name);
    if (fn) return this.callUserFunction(fn, args);

    switch (name) {
      case 'print':
        console.log(args[0] ?? '');
        return '';
      case 'sleep': {
        const seconds = parseFloat(args[0] ?? '');
        if (Number.isFinite(seconds) && seconds > 0) await delay(seconds * 1000);
        return '';
      }
      case 'read':
        try {
          return fs.readFileSync(args[0] ?? '', 'utf8');
        } catch {
          return '';
        }
      case 'write':
        try {
          fs.writeFileSync(args[0] ?? '', args[1] ?? '');
        } catch {
          // no errors in this language
        }
        return '';
      case 'exit':
        throw new ExitSignal();
      default:
        return '';
    }
  }

  // Dynamic scope: parameters temporarily sit on top of the one global pool.
  private async callUserFunction(fn: Func, args: string[]): Promise<string> {
    const shadowed: Array<[string, string | undefined]> = [];
    for (let i = 0; i < fn.params.length; i++) {
      const p = fn.params[i];
      shadowed.push([p.name, this.vars.get(p.name)]);
      const value =
        args[i] !== undefined && args[i] !== ''
          ? args[i]
          : p.def !== undefined
            ? await this.evalText(p.def)
            : '';
      this.vars.set(p.name, value);
    }
    try {
      return await this.execBlock(fn.body, true);
    } finally {
      for (const [pname, old] of shadowed.reverse()) {
        if (old === undefined) this.vars.delete(pname);
        else this.vars.set(pname, old);
      }
    }
  }

  // Count-loop variables shadow ordinary variables; innermost loop wins.
  private lookupCounter(name: string): number | undefined {
    for (let i = this.counters.length - 1; i >= 0; i--) {
      if (this.counters[i].name === name) return this.counters[i].value;
    }
    return undefined;
  }

  // The heart of the language: resolves \escapes, $variables (and count-loop
  // counters), inline input(...) prompts, and "quoted" AI expressions (with an
  // optional 'system prompt' after). Quotes must come in pairs — an unmatched
  // one is literal text.
  async evalText(src: string): Promise<string> {
    let out = '';
    let i = 0;
    while (i < src.length) {
      const c = src[i];

      if (c === '\\' && i + 1 < src.length) {
        out += src[i + 1];
        i += 2;
        continue;
      }

      if (c === '"') {
        const closed = scanUntil(src, i + 1, '"');
        if (closed) {
          const prompt = await this.evalText(closed.content);
          i = closed.next;
          // optional '...' right after: replaces the standard system prompt
          let system: string | undefined;
          let j = i;
          while (j < src.length && src[j] === ' ') j++;
          if (src[j] === "'") {
            const sys = scanUntil(src, j + 1, "'");
            if (sys) {
              system = await this.evalText(sys.content);
              i = sys.next;
            }
          }
          out += await this.ai.ask(prompt, system);
          continue;
        }
      }

      // input(...) works anywhere in a line. The whole content is the prompt
      // (commas included). A user-defined input() function still wins.
      if (c === 'i' && src.startsWith('input(', i) && !/[A-Za-z0-9_]/.test(src[i - 1] ?? '')) {
        const closed = scanParens(src, i + 'input('.length);
        if (closed) {
          if (this.funcs.has('input')) {
            out += await this.callFunction('input', closed.content);
          } else {
            const prompt = (await this.evalText(closed.content)).trim();
            out += await this.input.question(prompt + ' ');
          }
          i = closed.next;
          continue;
        }
      }

      if (c === '$') {
        const m = src.slice(i + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (m) {
          const counter = this.lookupCounter(m[0]);
          if (counter !== undefined) {
            out += String(counter);
            i += 1 + m[0].length;
            continue;
          }
          if (this.vars.has(m[0])) {
            out += this.vars.get(m[0]);
            i += 1 + m[0].length;
            continue;
          }
        }
        // unknown variable: leave the $ text alone so typos are easy to spot
      }

      out += c;
      i++;
    }
    return out;
  }
}

// Find the next unescaped `ch`; returns the content before it and the index
// after it, or null if there is no closing `ch`.
function scanUntil(
  src: string,
  start: number,
  ch: string,
): { content: string; next: number } | null {
  let content = '';
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      content += c + src[i + 1];
      i++;
      continue;
    }
    if (c === ch) return { content, next: i + 1 };
    content += c;
  }
  return null;
}

// Find the matching close paren (nesting-aware); returns the content before it
// and the index after it, or null if it never closes.
function scanParens(src: string, start: number): { content: string; next: number } | null {
  let content = '';
  let depth = 1;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      content += c + src[i + 1];
      i++;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') {
      depth--;
      if (depth === 0) return { content, next: i + 1 };
    }
    content += c;
  }
  return null;
}
