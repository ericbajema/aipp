#!/usr/bin/env node
import * as fs from 'node:fs';
import { argv, env, exit } from 'node:process';
import { parse } from './parser.js';
import { Interpreter } from './interpreter.js';
import { AI, DEFAULT_MAIN_SYSTEM, DEFAULT_BOOL_SYSTEM } from './ai.js';
import { Input } from './input.js';
import { loadConfig, defaultConfigToml } from './config.js';

const USAGE = [
  'usage: aipp <file> [--model <name>] [--host <url>]',
  '       aipp init            write a commented aipp.toml to the current directory',
  '       env: AIPP_MODEL, AIPP_HOST',
  '       precedence: flag > env > nearest aipp.toml > defaults (hermes3:3b, localhost:11434)',
  '       (to run a script literally named "init", use: aipp ./init)',
].join('\n');

let flagModel: string | undefined;
let flagHost: string | undefined;
let file: string | undefined;

const args = argv.slice(2);

if (args[0] === 'init') {
  if (fs.existsSync('aipp.toml')) {
    console.log('aipp: aipp.toml already exists — leaving it alone');
  } else {
    fs.writeFileSync('aipp.toml', defaultConfigToml(DEFAULT_MAIN_SYSTEM, DEFAULT_BOOL_SYSTEM));
    console.log('aipp: wrote aipp.toml (everything commented out — uncomment to use)');
  }
  exit(0);
}

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--model' || a === '-m') flagModel = args[++i] ?? flagModel;
  else if (a === '--host') flagHost = args[++i] ?? flagHost;
  else if (a === '--help' || a === '-h') {
    console.log(USAGE);
    exit(0);
  } else file = a;
}

if (!file) {
  console.error(USAGE);
  exit(1);
}

let source: string;
try {
  source = fs.readFileSync(file, 'utf8');
} catch {
  console.error(`aipp: cannot read file: ${file}`);
  exit(1);
}

const config = loadConfig(file);
const model = flagModel ?? env.AIPP_MODEL ?? config.model ?? 'hermes3:3b';
const host = flagHost ?? env.AIPP_HOST ?? config.host;

const input = new Input();
const interpreter = new Interpreter(
  new AI({
    model,
    host,
    temperature: config.temperature,
    mainSystem: config.prompts?.main,
    boolSystem: config.prompts?.bool,
  }),
  input,
);

try {
  await interpreter.run(parse(source));
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ECONNREFUSED/i.test(msg)) {
    console.error(`aipp: cannot reach Ollama at ${host ?? 'localhost:11434'} — is \`ollama serve\` running?`);
  } else {
    console.error(`aipp: ${msg}`);
  }
  exit(1);
} finally {
  input.close();
}
