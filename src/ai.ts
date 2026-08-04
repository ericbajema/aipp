import { Ollama } from 'ollama';

// The standard system prompt, replaceable per line with '...' or per project
// via [prompts] main in aipp.toml. Empirically tuned for small models — see
// CLAUDE.md before rewriting.
export const DEFAULT_MAIN_SYSTEM =
  'You are the runtime of a programming language. Every user message is an ' +
  'expression to evaluate. Respond with only the result — no explanation, no ' +
  'commentary, no quotes around it. For math, respond with just the answer ' +
  '(and the unit, if there is one). If asked to pick or generate something, ' +
  'output only that thing. Obey every constraint in the request exactly — if ' +
  'asked for a number between two bounds, the answer must be inside those bounds.';

export const DEFAULT_BOOL_SYSTEM =
  'You are a strict boolean judge. The user message is a condition or question ' +
  '— decide whether it is true or false. It may be math, a fact, a yes/no ' +
  'question, or a question about what somebody\'s reply means. First think it ' +
  'through step by step in "reasoning", then give "answer". ' +
  'Simple examples: "4 = 4" is true. "0 = 6" is false. "10 is bigger than 3" ' +
  'is true. "Is 7 a number" is true. "Is banana a number" is false. "Is ' +
  'banana a fruit" is true. "the sky is green" is false. An = between two ' +
  'words asks if they are exactly the same word, letter for letter — the ' +
  'meaning of the words does not matter: "apple = apple" is true, "cat = dog" ' +
  'is false, "correct = correct" is true (same word twice), "higher = ' +
  'correct" is false (different words), "lower = lower" is true. ' +
  'When judging a reply, reason about what the words mean before answering. ' +
  'Example: the player was asked about a guess and replied "that is bigger ' +
  'than my number" — the guess is bigger, so the player\'s number is SMALLER ' +
  'than the guess: "is their number smaller than the guess" is true, "is ' +
  'their number bigger than the guess" is false, "is their number equal to ' +
  'the guess" is false. A reply like "you got it" or "that is my number" ' +
  'means equal. ' +
  'Respond only with JSON: {"reasoning": "...", "answer": true or false}.';

export interface AIOptions {
  model: string;
  host?: string;
  temperature?: number; // ask() only; evalCondition always runs at 0
  mainSystem?: string; // replaces DEFAULT_MAIN_SYSTEM when set
  boolSystem?: string; // replaces DEFAULT_BOOL_SYSTEM when set
}

export class AI {
  private client: Ollama;
  private model: string;
  private temperature?: number;
  private mainSystem: string;
  private boolSystem: string;

  constructor(opts: AIOptions) {
    this.client = new Ollama(opts.host ? { host: opts.host } : {});
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.mainSystem =
      opts.mainSystem && opts.mainSystem.trim() !== '' ? opts.mainSystem : DEFAULT_MAIN_SYSTEM;
    this.boolSystem =
      opts.boolSystem && opts.boolSystem.trim() !== '' ? opts.boolSystem : DEFAULT_BOOL_SYSTEM;
  }

  async ask(prompt: string, system?: string): Promise<string> {
    const res = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: system && system.trim() !== '' ? system : this.mainSystem },
        { role: 'user', content: prompt },
      ],
      // Only pass temperature when configured, so the model's own default
      // applies otherwise (exactly the pre-config behavior).
      ...(this.temperature !== undefined ? { options: { temperature: this.temperature } } : {}),
      keep_alive: '15m',
    });
    return res.message.content.trim();
  }

  // Loop and if conditions: structured output so the model can only say
  // true/false, with a "reasoning" field first so small models get to think
  // before committing, and temperature 0 so the same condition always gets
  // the same verdict. The condition is sent as-is — it is often already a
  // full question, so no extra framing. A 'custom system prompt' on the
  // condition replaces BOOL_SYSTEM; the JSON schema still forces the shape.
  async evalCondition(cond: string, system?: string): Promise<boolean> {
    const res = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: system && system.trim() !== '' ? system : this.boolSystem },
        { role: 'user', content: cond },
      ],
      format: {
        type: 'object',
        properties: {
          reasoning: { type: 'string' },
          answer: { type: 'boolean' },
        },
        required: ['reasoning', 'answer'],
      },
      options: { temperature: 0 },
      keep_alive: '15m',
    });
    try {
      return JSON.parse(res.message.content).answer === true;
    } catch {
      return false;
    }
  }
}
