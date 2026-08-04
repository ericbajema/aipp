# AI++: the programming language of the future
This document describes the specs of a new programming language that I want to build. This is unlike any conventional programing language; it runs entirely on AI. 

Every expression is executed by AI. There are very few built-in functions and operations to keep the language as simple as possible. Since the whole language runs on AI, it can do "calculations" previously difficult in other programming languages. For example, you could have it select a random president. From this president, you could have the AI output information based on user information. Instead of having an object that stores all the info about each president, the AI will just generate it.

This programming language can, and will, produce different results each time that you run it, and that is part of the fun! It is not meant to be deterministic, it is not meant to be fast to run, it will win on pure development velocity.
## Syntax
There are some built in structures that you would find in normal programming languages, functions, variables, loops, but that's about it. It is a purely functional programming language for simplicity's sake. The syntax is meant to feel like natural language: structures use familiar keywords (`while:`, `count:`, `if:`, `elif:`, `else:`), calls look like `func(args)`, and only a handful of characters are special.

```
# This is a comment. There are only single line comments. They are denoted with a #

# This is a variable. They can have any name or value.
var = 0 

# Variable can be reassigned at any time to any value
var = 10

# This variable stores the string "hello! how are you?" All expresions are stored 
# as strings (including "0" from the previous example). This is because all
# expresions get evalutated by being sent to an AI, so it doesn't matter to have
# types.
text = hello! how are you?

# Assignment with no quotes stores the right side literally as a string (after
# filling in $ variables and running any input() prompts). No AI call happens.
# This stores the string "0 + 10", not "10"
math = 0 + 10

# Assignment with a double quoted expression sends it to the AI and stores the
# answer. This stores an actual president name, like "Abraham Lincoln"
pres = "pick a random president"

# To store that text literally instead, escape the quotes. This stores the
# text "pick a random president" (quote characters included)
literal = \"pick a random president\"

# To use a variable, prefix a $. This clears confusion between a variable and a
# string. This expresion evaluates to "hello! how are you? I'm doing bad..."
another_var = $text I'm doing bad...

# If a variable doesn't exist, the $ text is just left alone. This line prints
# "$doesnotexist" (there are no errors in this language, and this makes typos
# easy to spot)
$doesnotexist

# To get user input, use the input function. It prints the text you pass it,
# waits for the user to type a line, and evaluates to what they typed. It
# automatically puts a space after the prompt if there is not already one there.
name = input(what is your name?)

# input() works inline anywhere in a line of text, so you can put it together:
test_var = input(hi) $text what is going on
# This prompts the user with the text "hi". It then adds their answer to the
# rest of the string and assigns the whole thing to test_var

# Escape characters
# For any special characters, you can use \ like most languages. Examples:
# \#, \$, \", \', \\, \( etc.

# The double quotes signify an AI executable expression. 0 + 10 will be sent
# to an LLM to be evaluated. Since this is not a variable, function decleration,
# loop, or any other built in functionality, it will print the answer to the 
# console. Double quotes are the ONLY thing in the language that triggers an
# AI call (besides while loop conditions and if statements).
"0 + 10"

# A bare line is NOT sent to the AI. It prints literally to the output (after
# $ variables are filled in). This prints "Hello, world" with no AI involved.
Hello, world

# The output of every expression will just ouput to the console. There are no
# syntax errors in this language, it will just print "var=hello"don'tdothat'"
# to the console. Note: the whitespace is important for variable assignment
var=hello"don'tdothat'

# The text in single quotes after an expression will replace the standard system
# prompt. The standard system prompt will be something like: "answer as sucisntly 
# as possible. Do not explain your answer. For math, just respond with the 
# answer and the unit"
"0 + 10" 'respond in ft'

# Custom system prompts can use variables too. This asks the LLM the question
# stored in var, using the system prompt stored in text
text = respond in exactly 50 words
var = what is the color of the moon
"$var" '$text'

# This is a function. Like python, a colon plus an indented body (tabs or 4
# spaces) defines it. Nested functions are allowed. The language uses dynamic
# scope: there is one global pool of variables, and function parameters just
# temporarily sit on top of that pool while the function runs. Functions are
# simple and will always return their last line.
func():
	hello, world!
	
# To invoke the function is simple (no colon, no body):
func()
# Prints "hello, world!"

# Lines inside a function body do NOT print while the function runs. Only the
# return value (the last line) prints when the function is called on its own.
# Use print(x) to print from inside a function body.

# A function call on the right side of an assignment stores the return value
# instead of printing it:
x = func()

# You can completely reassign functions whenever you want. 
func():
	this is new # func() now returns "this is new" 
	
# The parenthesis are used for passing parameters. The parameters are scoped to 
# within the function. Any nested functions that use the same parameter name will
# reassign the parameter for its entire rest of its original scope. You can also
# provide a default parameter. Multiple parameters are separated by commas,
# both when defining and when calling: func(a, b = 2):
func(x = 1): # sets x to 1 if no input is given
	innerfunc(x):
		x = 10   # sets x to 10. 
		$x        # returns x (variable assignment evaluates to nothing)
	innerfunc(x) # returns 10
	
func(hello!) # func takes "hello!" as an input and outputs "10"

# There are some nice utility functions in this language. They are called just
# like a standard function, and they can be overwritten during a program.
print(x) # prints x to the console. This is useful for printing mid functions
sleep(x) # pauses the program for x seconds
read(location) # returns the contents of the file at location
write(location, text) # writes text to the file at location
input(x) # prints x as a prompt and returns what the user types
exit() # quits the program immediately, from anywhere

# There are no operators in this language. All "math" is done by the AI.

# Loops are quite simple in this language. There is a while loop. It continues
# until the AI determines that the expression is met. As a built in safety feature,
# loops end after a limit is reached (default: 100, changeable per loop, see below)
x = 0
while: $x = 10 # loops until this expression (which is automatically evaluated by AI) has the AI respond: "true"
	x = $x + 2
	$x
	
# To change the loop limit, pass a limit number in parenthesis. This is to stop
# an AI from never finishing the loop. These limits are highly recommended
while(10): what 
	"Say a random word. It doesn't matter the word"
	
# You can optionally put quotes around the condition of a while loop (and later,
# if statements). You can also swap the true/false system prompt for your own
# using single quotes. The following two loops are the same:
while: "the world exists" 'always evaluate to false'
	I am alive

while: the world exists 'always evaluate to false'
	I am alive
	
# There is also a simple counting loop. Note: you cannot use variables here.
# The name in parenthesis is the counting variable. This will print 6, 7, 8, 9, 10
count(i): 6..10
	$i

# If you leave the counting variable name off, you just can't access the count.
# A single number counts from 1 up to it, so this prints chicken 10 times.
count: 10
	chicken

# These loops can also count down
# This (probably) prints 7, 6, 5, 4, 3
count(x): 10..6
	"$x - 3"
	
# The counting variable is not editable. It is a very special variable because
# it is actually stored as a number. In nested loops it shadows an outer counter
# with the same name; when the inner loop ends, the name goes back to the outer
# loop's count.

# If statements use pretty standard syntax: if, elif (else if), and else.
# The expression is always evaluated by the AI, which must respond true or
# false (just like a while loop condition). Branches are checked top to bottom
# and only the first true one runs. Like while loops, the quotes around the
# expression are optional, and a single quoted system prompt swaps the
# true/false judge's instructions.
number = 7
if: Is $number a number
	it is a number
elif: "is $number a fruit"
	It is a fruit
elif: is $number a car 'respond false'
	It is a car
else:
	It is none of these.

# Like functions and loops, an if/elif/else line only counts as a structure when
# it has an indented body under it — otherwise it is just text. If an if chain
# is the last line of a function, the function returns the value of whichever
# branch ran.
```

## System prompts
There a couple system prompts that should be handed to the AI so it can respond more reliably. There are two that we need, one for the main prompts, the other for the while loop. The main one should talk about a concise response that only responds with the answer. The while loop should make sure that it only responds with true or false. Obviously, you can change the system prompt to whatever you want
## The Implementation
A basic terminal app that can run a text file written in this language. `aipp testfile.txt` would run "testfile.txt" as an AI++ script. It is a simple tree-walking interpreter: a line-based parser (the language is line-oriented and indentation-blocked) builds a block tree, and an evaluator walks it. Structures are recognized by their keyword headers (`name(params):`, `while:`, `count:`, `if:`/`elif:`/`else:`) plus an indented body — a header line with no body is just text, which is what keeps the language free of syntax errors. All structure (variables, $ interpolation, input() prompts, functions, loops, limits) is handled deterministically in code — only double-quoted expressions and while/if conditions make AI calls.

Written in TypeScript on Node, so it can later grow into a visual IDE and plug into the MCP/tools ecosystem easily.

The AI is a local model served by Ollama, which exposes an HTTP API on localhost:11434 — no paid API, no keys. The default model is hermes3:3b (whatever is installed locally), configurable via a flag or env var. While-loop and if conditions use Ollama's structured output (JSON schema constraint) so the model can ONLY answer true or false. Requests set keep_alive so the model stays warm between calls.
