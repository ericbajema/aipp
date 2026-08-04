# The AI++ Language

AI++ is a line-oriented, indentation-blocked language with one unusual rule: anything in `"double quotes"` is sent to an AI, and its answer takes the expression's place. Everything else — variables, loops, functions, input — is ordinary deterministic code.

The second unusual rule: **there are no syntax errors.** A line that doesn't match any structure isn't rejected — it's just text, and text prints. Every file is a valid AI++ program.

- [Text and comments](#text-and-comments)
- [Variables](#variables)
- [AI expressions](#ai-expressions)
- [User input](#user-input)
- [Functions](#functions)
- [If / elif / else](#if--elif--else)
- [While loops](#while-loops)
- [Count loops](#count-loops)
- [Built-in functions](#built-in-functions)
- [Escape characters](#escape-characters)
- [The fine print](#the-fine-print)

## Text and comments

A bare line prints itself. No quotes, no print call, no AI:

```aipp
Hello, world
```
```
Hello, world
```

Comments start with `#` and run to the end of the line. They are the only comment form:

```aipp
# This whole line is a comment
Good morning   # and this part is too
```
```
Good morning
```

## Variables

Assignment is `name = value`, and the spaces around `=` are required — `x=5` is just text and prints literally. Everything is stored as a string; since the AI evaluates all "computation," types would be pointless.

```aipp
mood = curious
x=5
```
```
x=5
```

Use `$name` to interpolate a variable anywhere in a line:

```aipp
animal = axolotl
My favorite animal is the $animal.
```
```
My favorite animal is the axolotl.
```

An unquoted right-hand side is stored **literally** (after `$` interpolation and any `input()` prompts) — no AI call, no math:

```aipp
sum = 2 + 2
The sum is $sum
```
```
The sum is 2 + 2
```

If a variable doesn't exist, the `$name` is left alone — which makes typos easy to spot:

```aipp
Hello, $freind
```
```
Hello, $freind
```

## AI expressions

`"Double quotes"` are the only thing in the language that calls the AI (aside from `while`/`if` conditions). The expression is replaced by the AI's answer — printed if it's on its own, stored if it's being assigned:

```aipp
"2 + 2"
pres = "name a random US president"
$pres was a president.
```
```
4
Abraham Lincoln was a president.
```

Variables interpolate inside AI expressions before they're sent, so you can build prompts out of program state:

```aipp
topic = black holes
"explain $topic in one sentence"
```

Follow an expression with `'single quotes'` to replace the default system prompt for that one call:

```aipp
"how far away is the moon" 'respond in bananas as a unit of length'
```

The custom system prompt can use variables too:

```aipp
style = talk like a pirate
"describe the ocean" '$style'
```

To use quote characters as plain text, escape them: `\"like this\"`.

## User input

`input(prompt)` prints its prompt, waits for the user to type a line, and evaluates to what they typed. It works anywhere in a line, including mid-sentence and inside assignments:

```aipp
name = input(what is your name?)
Nice to meet you, $name!
```
```
what is your name? Eric
Nice to meet you, Eric!
```

Because it evaluates in place, you can feed input straight into an AI expression:

```aipp
"write a haiku about $topic" 'no commentary, just the haiku'
```

works nicely as:

```aipp
topic = input(what should the haiku be about?)
"write a haiku about $topic" 'no commentary, just the haiku'
```

## Functions

A name followed by parentheses and a colon, with an indented body (one tab or 4 spaces), defines a function. Calling it is the same line without the colon or body:

```aipp
greet():
    Hello there!

greet()
```
```
Hello there!
```

Three rules govern functions:

1. **The body runs silently.** Lines inside a function don't print while it runs — use `print(x)` if you want mid-function output.
2. **The last line is the return value.** Whatever the final line evaluates to is what the call prints (or stores, if assigned).
3. **Functions can be redefined at any time.** The newest definition wins.

```aipp
fortune():
    mood = "pick one word: good or bad"
    "tell a one-sentence $mood fortune"

today = fortune()
Your fortune: $today
```

Parameters go in the parentheses, separated by commas, with optional defaults:

```aipp
greet(name, punct = !):
    Hello, $name$punct

greet(Eric)
greet(Eric, ?)
```
```
Hello, Eric!
Hello, Eric?
```

Scope is **dynamic**: there is one global pool of variables, and parameters temporarily sit on top of it during the call, restored after. A function can read and write any variable the program has.

## If / elif / else

`if:` / `elif:` / `else:` chains look conventional, but the condition is judged **true or false by the AI**. Branches are checked top to bottom and only the first true one runs:

```aipp
food = input(name a food:)
if: $food is a fruit
    Fruity choice.
elif: $food is a vegetable
    Very healthy.
else:
    Neither fruit nor vegetable. Bold.
```

Quotes around the condition are optional (`if: "$food is a fruit"` is the same), and a `'single quoted'` prompt after the condition replaces the true/false judge's instructions:

```aipp
if: the glass is half full 'you are a pessimist. judge accordingly'
    Optimism prevailed anyway.
```

Conditions always run at temperature 0 with the model forced to answer only `true` or `false` — so the same condition on the same state gives the same verdict.

> **Reliability tip for small models:** several independent AI-judged conditions in a row can be coin-flippy. The pattern that works: one AI call with a custom system prompt reduces messy input to a single word, then the chain branches on plain word equality, which the judge handles nearly perfectly.
>
> ```aipp
> answer = input(is your number bigger or smaller than 50?)
> direction = "$answer" 'classify the reply as exactly one word: bigger, smaller, or correct'
> if: $direction = bigger
>     Going higher...
> elif: $direction = smaller
>     Going lower...
> else:
>     Got it!
> ```

## While loops

`while:` loops until the AI judges the condition true — the same true/false judge as `if:`, including optional quotes and the optional `'custom judge prompt'`:

```aipp
story =
while: the story mentions a dragon
    line = "add one sentence to this story: $story"
    story = $story $line
    print($line)
```

Every loop has a safety limit — after that many iterations it stops even if the condition never comes true. The default is 100; set your own in parentheses:

```aipp
while(5): pigs can fly
    Still no flying pigs.
```
```
Still no flying pigs.
Still no flying pigs.
Still no flying pigs.
Still no flying pigs.
Still no flying pigs.
```

Limits are highly recommended. You are asking an AI when to stop.

## Count loops

`count` is the deterministic loop — no AI involved. Give it a range and, optionally, a counter name:

```aipp
count(i): 6..10
    Number $i reporting in.
```
```
Number 6 reporting in.
Number 7 reporting in.
Number 8 reporting in.
Number 9 reporting in.
Number 10 reporting in.
```

A single number counts from 1 up to it, and you can leave the counter off if you don't need it:

```aipp
count: 3
    chicken
```
```
chicken
chicken
chicken
```

Ranges can run backwards (`count(i): 10..1`), and the bounds must be literal numbers — variables aren't allowed here. The counter is special: it's the only value in the language stored as a real number, it can't be reassigned, and in nested loops an inner counter shadows an outer one with the same name until the inner loop ends.

## Built-in functions

| Call | What it does |
|---|---|
| `print(x)` | prints `x` — mainly useful inside function bodies, which are otherwise silent |
| `sleep(x)` | pauses for `x` seconds |
| `read(location)` | evaluates to the contents of the file at `location` (missing file → empty string) |
| `write(location, text)` | writes `text` to the file at `location` |
| `input(x)` | prompts with `x`, evaluates to what the user types |
| `exit()` | ends the program immediately, from anywhere |

Builtins are called like any function, whole-line or as the whole right side of an assignment. Defining your own function with the same name overrides the builtin — the language never stops you.

## Escape characters

Backslash makes any special character literal: `\"`, `\'`, `\$`, `\#`, `\(`, `\\`.

```aipp
The \$ sign and the \# sign, printed plainly. \"Quotes too.\"
```
```
The $ sign and the # sign, printed plainly. "Quotes too."
```

## The fine print

A few properties worth knowing, all deliberate:

- **A structure is only a structure if it has an indented body.** `while: whatever` with nothing indented under it is just a line of text that prints. This is what makes syntax errors impossible.
- **If a function ends in an if-chain**, the function returns the value of whichever branch ran.
- **Interpolation is injection-safe.** `$var` values and `input()` answers are inserted as inert text and never re-scanned — user input can't smuggle in AI calls, structures, or escapes.
- **Nothing throws.** Unknown variables stay literal, missing files read as empty, malformed config warns and carries on.
- **Nondeterminism is scoped.** `"quoted"` calls are creative (configurable temperature); `while`/`if` verdicts are pinned at temperature 0. Randomness where you want it, repeatability where you need it.

Model, host, temperature, and the two default system prompts are all configurable per project — see [Configuration in the README](README.md#configuration).
