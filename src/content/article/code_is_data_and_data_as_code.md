---
title: "Code is data and data as code"
description: "How programming languages transform code."
created_at: 1726708881000
archived: false
related_posts:
  - thinking_about_database_anomalies
---

# Code is data and data as code

Really often I meet someone who don't really know how programming languages turns or code into real programs, like "how they get my program source code as a text file and turns it into a real program that a computer can understand and execute?
There is an AI on my computer reading the code and telling the computer what it needs to do? There is a magic black box that nobody knows how works doing this job inside my computer?"

Nah, programming languages just transforms code into data and then handle data as code

## Code is data

The main idea when thinking about an interpreter is that code is just data, and the raw data that we write don't have so much information to work with. So on the first step we only have a raw text source that we don't even know if it's a valid program.

```js
// consider this as just a text file
let x = 2 + 3;
print(x);
```

So we need to check if its a valid program and transform it into a structure that is easier to the computer to understand, we need to get more information about the source code we are handling. The first usual step is to break the source text into a sequence of tokens to be able to analyze better the structure of the text, we call this step as *lexer analysis*.

```js
["let", "x", "=", "y", "&", "3", ";", "print", "(", "x", ")", ";"]
```

Here we already can check the structure of the language grammar, it defines the relation between the language tokens. One way to represent the grammar of a language is by using [BNF (Backus-Naur Form)](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form), the next snippet defines in the grammar how arithmetic operators will be relationed with the numbers in this language.

```rs
<operator> ::= <operator> " + " <operator> | <operator> " - " <operator> | <value>
<value> ::= [0-9]
```

The grammar that I used on the whole snippet including the "let" and the print is next one. You can try checking this grammar over your own input [here](https://bnfplayground.pauliankline.com/).

```rs
<print> ::= "print" "(" <operator> ")" ";" | <let>
<let> ::= "let " ([a-z] | [A-Z])+ "=" <operator> ";" <print> | <operator>
<operator> ::= <operator> "+" <operator> | <operator> "-" <operator> | <value>
<value> ::= [a-z] ([a-z] | [0-9])* | [0-9]+
```

With this grammar rules we can check if the sequence of tokens that we have is valid while transforming the source into the tokens of our language. The next snippet breaks a string into tokens following the grammar specification.

```ts
const lexer = (source: string): string[] => {
  const tokens: string[] = [];
  let currentToken = "";
  for (const char of source) {
    if ([" ", "(", ")", ";", "+", "-"].includes(char)) {
      if (currentToken) tokens.push(currentToken);
      if (char !== " ") tokens.push(char);
      currentToken = "";
    } else {
      currentToken += char;
    }
  }
  return tokens;
};
```

## Data as code

Considering that we have a valid sequence of tokens we can transform our data into a structure easier to handle on next steps. This structure will still represent the original code but in a easier way to work with.

There are a lot of strategies to transform this sequence into data structures, this step is called *parsing*. Usually we represent it as trees because the recursive nature of trees of this grammar turns representing and handling code as trees a lot easier. Most of the scenarios a structure can contain itself like in arithmetic expressions (a sum can contain another sum, like in "1 + (2 + 3)") or in usual statements (most of the languages can have nested loops or conditionals).

```js
// here we defined or let as a tree and the next operations are inside it
{ node: "let",
  var: "x",
  value: { node: "sum", left: 2, right: 3 },
  next: { node: "print", value: { node: "variable", value: "x" } } }
```

There is an example of how to parse the tokens to have a tree like this.

```ts
type Value = { node: "number", value: number }
           | { node: "variable", value: string };

type Operator = { node: "sum"
                  left: Value
                  right: Operator }
              | { node: "subtraction"
                  left: Value
                  right: Operator }
              | Value;

type Let = { node: "let"
             variable: string
             value: Operator
             next: Print }
         | Operator;

type Print = { node: "print"
               value: Operator }
           | Let;

const parseValue = (tokenList: string[]): [Value, string[]] => {
  const [token, ...tokens] = tokenList;
  
  if (isNaN(Number(token)))
    return [{ node: "variable", value: token }, tokens];

  return [{ node: "number", value: Number(token) }, tokens];
};

const parseOperator = (tokenList: string[]): [Operator, string[]] => {
  const [value, operator, ...tokens] = tokenList;

  if (operator === "+") {
    const [left, _] = parseValue([value, ...tokens]);
    const [right, remaining] = parseOperator(tokens);
    return [{ node: "sum", left, right }, remaining];
  }

  if (operator === "-") {
    const [left, _] = parseValue([value, ...tokens]);
    const [right, remaining] = parseOperator(tokens);
    return [{ node: "subtraction", left, right }, remaining];
  }

  return parseValue(tokenList);
};

const parseLet = (tokenList: string[]): [Let, string[]] => {
  const [token, variable, equal, ...operator] = tokenList;
  if (token === "let" && equal === "=") {
    const [value, [semicolon, ...print]] = parseOperator(operator);
    const [next, remaining] = parse(print);
    return [{ node: "let", variable, value, next }, remaining];
  }

  return parseOperator(tokenList);
};

const parse = (tokenList: string[]): [Print, string[]] => {
  const [print, openbraces, ...tokens] = tokenList;
  if (print == "print") {
    const [value, [closebraces, semicolon, ...remaining]] = parseOperator(tokens);
    return [{ node: "print", value }, remaining];
  }
  
  return parseLet(tokenList);
};
```

With a tree defining our code, we can do more checkings easier. We could navigate over the nodes holding a context and checking rules that the grammar don't cover. Some languages adds more metadata to this tree, like types, to constrain the set of programs that the developer can write. Having more constraints on the language keeps you safe while writing you code, avoiding more semantic errors like trying to sum strings or to multiply booleans.

Some languages takes it as an disadvantage because they prefer to be more flexible to what the developer want to write, but it has a lot of trade-offs that I will not write about here.

## Everything comes from trees

With this structured code representation we can do a lot of useful things. The simplest use case is to just navigate over the tree applying the language execution logic to each node.

```js
{ node: "let",
  var: "x",
  value: { node: "sum", left: 2, right: 3 },
  next: { node: "print", value: { node: "variable", value: "x" } } }
```

Here we would first get the node "let" and navigate to its "value" node, here we can execute the "sum" node and then store the result as the "value" of the let on the memory using the "var" value as a key to access it later.
Navigating to the "next" we would find the "print" node where the "value" is the variable "x" in the context and then printing the result of the earlier sum.

Here is an example of how to evaluate this tree structure.

```ts

const evaluate = (tree: Print, context: Record<string, number>): number => {
  if (tree.node === "print") {
    const result = evaluate(tree.value, context);
    console.log(result);
    return result;
  }

  if (tree.node === "let") {
    const newContext = { [tree.variable]: evaluate(tree.value, context),
                         ...context };
    return evaluate(tree.next, newContext);
  }

  if (tree.node === "variable")
    return context[tree.value] || 0;

  if (tree.node === "sum")
    return evaluate(tree.left, context) + evaluate(tree.right, context);

  if (tree.node === "subtraction")
    return evaluate(tree.left, context) - evaluate(tree.right, context);

  if (tree.node === "number")
    return tree.value;

  tree satisfies never;
};
```

This way we *interpreted* the code only navigating over the tree and using it to operate a context. This way we made a kind of tree-walking interpreter for our language snippet.

But with this tree structure made easier to transform it into another forms of data, like another languages. We could turn the "let" node into a valid snippet of lua, navigating over the tree and accumulating a source string like [this](https://github.com/bronen/luajit-rinha-de-compiler).

```lua
-- This way the result would be something like this.
local x = 2 + 3
print(x)
```

