import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseToml } from 'smol-toml';

// Per-project config, discovered by walking up from the script's directory.
// Every field is optional; a missing file means built-in defaults. In keeping
// with the language's no-errors philosophy, a broken config never stops a
// program: malformed TOML or a wrong-typed field gets one stderr warning and
// is ignored.
export interface AippConfig {
  model?: string;
  host?: string;
  temperature?: number; // "quoted" AI calls only; conditions always run at 0
  prompts?: { main?: string; bool?: string };
}

export function loadConfig(scriptPath: string): AippConfig {
  let dir = path.dirname(path.resolve(scriptPath));
  for (;;) {
    const file = path.join(dir, 'aipp.toml');
    if (fs.existsSync(file)) return readConfig(file);
    const parent = path.dirname(dir);
    if (parent === dir) return {}; // filesystem/drive root
    dir = parent;
  }
}

function readConfig(file: string): AippConfig {
  let raw: Record<string, unknown>;
  try {
    raw = parseToml(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    warn(file, err instanceof Error ? err.message : String(err));
    return {};
  }

  const cfg: AippConfig = {};
  if (raw.model !== undefined) {
    if (typeof raw.model === 'string') cfg.model = raw.model;
    else warn(file, 'model must be a string');
  }
  if (raw.host !== undefined) {
    if (typeof raw.host === 'string') cfg.host = raw.host;
    else warn(file, 'host must be a string');
  }
  if (raw.temperature !== undefined) {
    if (typeof raw.temperature === 'number' && Number.isFinite(raw.temperature)) {
      cfg.temperature = raw.temperature;
    } else warn(file, 'temperature must be a number');
  }
  if (raw.prompts !== undefined) {
    if (typeof raw.prompts === 'object' && raw.prompts !== null && !Array.isArray(raw.prompts)) {
      const prompts = raw.prompts as Record<string, unknown>;
      cfg.prompts = {};
      for (const key of ['main', 'bool'] as const) {
        if (prompts[key] !== undefined) {
          if (typeof prompts[key] === 'string') {
            // Trimmed so a TOML '''block''' (which keeps its final newline)
            // reproduces the built-in prompt text exactly.
            cfg.prompts[key] = (prompts[key] as string).trim();
          } else warn(file, `prompts.${key} must be a string`);
        }
      }
    } else warn(file, 'prompts must be a table');
  }
  return cfg;
}

function warn(file: string, msg: string): void {
  console.error(`aipp: warning: ignoring bad aipp.toml at ${file}: ${msg}`);
}

// The scaffold written by `aipp init` and committed at the repo root. Every
// line is commented out, so the file documents the defaults without changing
// behavior until the user uncomments something. The prompt texts are passed
// in from ai.ts so the scaffold can never drift from the real defaults —
// regenerate with `aipp init` after tuning them. (Constraint: a prompt must
// not contain ''' or it would break the TOML literal block when uncommented.)
export function defaultConfigToml(mainSystem: string, boolSystem: string): string {
  const lines = [
    `AI++ per-project config. Discovered by walking up from the script's`,
    `directory; the first aipp.toml found wins. Everything is optional and`,
    `commented out — uncomment a line to use it.`,
    `Precedence: CLI flag > AIPP_MODEL / AIPP_HOST env > this file > defaults.`,
    ``,
    `model = "hermes3:3b"`,
    `host = "http://localhost:11434"`,
    ``,
    `Temperature for "quoted" AI calls. while/if conditions always run at`,
    `temperature 0 so the same condition always gets the same verdict.`,
    `temperature = 0.8`,
    ``,
    `The default system prompts, exactly as built in. They are kept on one`,
    `line each and empirically tuned for small models — measure any rewrite`,
    `over many runs before trusting it.`,
    `[prompts]`,
    `main = '''`,
    mainSystem,
    `'''`,
    `bool = '''`,
    boolSystem,
    `'''`,
  ];
  return lines.map((l) => (l === '' ? '' : `# ${l}`)).join('\n') + '\n';
}
