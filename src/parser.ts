// AI++ parser: line-oriented, indentation-blocked (tabs, or 4 spaces = 1 level).
// Produces a block tree. There are no syntax errors in this language — anything
// that doesn't match a known structure is kept as a plain line.

export interface Param {
  name: string;
  def?: string; // default value text, evaluated at call time
}

export type Node =
  | { kind: 'line'; text: string }
  | { kind: 'funcdef'; name: string; params: Param[]; body: Node[] }
  | { kind: 'while'; cond: string; condSys?: string; limit: number; body: Node[] }
  | { kind: 'count'; varName: string | null; from: number; to: number; body: Node[] }
  | { kind: 'if'; branches: Branch[] };

export interface Branch {
  cond: string | null; // null = the else branch
  condSys?: string;
  body: Node[];
}

interface RawLine {
  indent: number;
  text: string;
}

// Cut everything from the first unescaped # onward.
function stripComment(line: string): string {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && i + 1 < line.length) {
      out += c + line[i + 1];
      i++;
      continue;
    }
    if (c === '#') break;
    out += c;
  }
  return out;
}

export function parseParams(src: string): Param[] {
  if (src.trim() === '') return [];
  const params: Param[] = [];
  for (const part of splitTopLevel(src)) {
    const m = part.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*(.*?)\s*)?$/);
    if (m) params.push({ name: m[1], def: m[2] });
  }
  return params;
}

// Split on commas, respecting \-escapes and paired double quotes.
export function splitTopLevel(src: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      current += c + src[i + 1];
      i++;
      continue;
    }
    if (c === '"') inQuote = !inQuote;
    if (c === ',' && !inQuote) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts;
}

// A condition may optionally be wrapped in double quotes, and may optionally be
// followed by a 'single quoted' replacement for the true/false system prompt.
function parseCondition(raw: string): { cond: string; sys?: string } {
  let text = raw.trim();
  let sys: string | undefined;
  const m = text.match(/^(.*\S)\s+'((?:[^'\\]|\\.)*)'$/s);
  if (m) {
    text = m[1];
    sys = m[2];
  }
  const quoted = text.match(/^"(.*)"$/s);
  if (quoted) text = quoted[1];
  return { cond: text, sys };
}

const WHILE_RE = /^while\s*(?:\(\s*(\d+)\s*\))?\s*:\s*(.*)$/;
const COUNT_RE = /^count\s*(?:\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\))?\s*:\s*(.*)$/;
const RANGE_RE = /^(-?\d+)\s*\.\.\s*(-?\d+)$/;
const IF_RE = /^if\s*:\s*(.*)$/;
const ELIF_RE = /^elif\s*:\s*(.*)$/;
const ELSE_RE = /^else\s*:\s*$/;
const FUNC_RE = /^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)\s*:\s*$/;

export function parse(source: string): Node[] {
  const raws: RawLine[] = [];
  for (const rawLine of source.replace(/^﻿/, '').split(/\r?\n/)) {
    let i = 0;
    let indent = 0;
    while (i < rawLine.length) {
      if (rawLine[i] === '\t') {
        indent++;
        i++;
      } else if (rawLine.startsWith('    ', i)) {
        indent++;
        i += 4;
      } else {
        break;
      }
    }
    const text = stripComment(rawLine.slice(i)).trimEnd();
    if (text.trim() === '') continue;
    raws.push({ indent, text });
  }

  let pos = 0;

  function block(minIndent: number): Node[] {
    const nodes: Node[] = [];
    while (pos < raws.length && raws[pos].indent >= minIndent) {
      const { indent, text } = raws[pos];
      pos++;
      const hasBody = pos < raws.length && raws[pos].indent > indent;

      // while: cond   or   while(limit): cond
      const wh = text.match(WHILE_RE);
      if (wh && hasBody) {
        const body = block(indent + 1);
        const { cond, sys } = parseCondition(wh[2]);
        nodes.push({
          kind: 'while',
          cond,
          condSys: sys,
          limit: wh[1] !== undefined ? Number(wh[1]) : 100,
          body,
        });
        continue;
      }

      // count(name): a..b   or   count: n  (counts 1 up to n)
      const count = text.match(COUNT_RE);
      if (count && hasBody) {
        const spec = count[2].trim();
        const range = spec.match(RANGE_RE);
        if (range || /^\d+$/.test(spec)) {
          const body = block(indent + 1);
          nodes.push({
            kind: 'count',
            varName: count[1] ?? null,
            from: range ? Number(range[1]) : 1,
            to: range ? Number(range[2]) : Number(spec),
            body,
          });
          continue;
        }
        // a count spec that isn't numbers falls through to a plain line
      }

      // if: cond with an indented body starts a chain; elif:/else: lines at
      // the same indent (with bodies) continue it. else: ends the chain.
      const iff = text.match(IF_RE);
      if (iff && hasBody) {
        const first = parseCondition(iff[1]);
        const branches: Branch[] = [
          { cond: first.cond, condSys: first.sys, body: block(indent + 1) },
        ];
        while (pos < raws.length && raws[pos].indent === indent) {
          const next = raws[pos].text;
          const elif = next.match(ELIF_RE);
          const isElse = ELSE_RE.test(next);
          const nextHasBody = pos + 1 < raws.length && raws[pos + 1].indent > indent;
          if ((!elif && !isElse) || !nextHasBody) break;
          pos++;
          if (isElse) {
            branches.push({ cond: null, body: block(indent + 1) });
            break;
          }
          const pc = parseCondition(elif![1]);
          branches.push({ cond: pc.cond, condSys: pc.sys, body: block(indent + 1) });
        }
        nodes.push({ kind: 'if', branches });
        continue;
      }

      // name(params): followed by an indented block is a definition;
      // name(args) with no colon is a call, handled at runtime.
      const fn = text.match(FUNC_RE);
      if (fn && hasBody) {
        const body = block(indent + 1);
        nodes.push({ kind: 'funcdef', name: fn[1], params: parseParams(fn[2]), body });
        continue;
      }

      nodes.push({ kind: 'line', text });
    }
    return nodes;
  }

  return block(0);
}
