---
title: "Code is data and data as code"
description: "How programming languages transform code."
created_at: 1726708881000
archived: false
related_posts:
  - thinking_about_database_anomalies
---

# Code is data and data as code

When working with interpreters and compilers, the general idea is that code is just data and the raw data that we write don't have so much information to work with. So to be able to compute a text with the source of a program we need to do some steps.

```js
// consider this as just a text file
let x = 2 + 3;
print(x);
```

The interpreter needs to check if it's a valid program and transform it into a structure easier to compute. The first thing we could do to get more information about the source code is to break the source text into a sequence of tokens, this way we are able to reason about the structure we are handling, we call this step as *lexer analysis*.

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

```js
// The result of this funcion being applied on our first snippet
["let", "x", "=", "y", "&", "3", ";", "print", "(", "x", ")", ";"]
```

This structure still represents the original code, but now we can validate if it follows the specification of how a program in this language needs to be written. To validate this kind of rules we must first define the grammar of the language.

The grammar is a set of rules that defines the relation between the language tokens. One way to represent the grammar of this language is by using [BNF (Backus-Naur Form)](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form). The next snippet defines the grammar that I used to on the first snippet, you can try checking this grammar over your own input [here](https://bnfplayground.pauliankline.com/).

```rs
<print> ::= "print" "(" <operator> ")" ";" | <let>
<let> ::= "let " ([a-z] | [A-Z])+ "=" <operator> ";" <print> | <operator>
<operator> ::= <operator> "+" <operator> | <operator> "-" <operator> | <operator> "*" <operator> | <operator> "/" <operator> | <value>
<value> ::= [a-z] ([a-z] | [0-9])* | [0-9]+
```

If the sequece that we have is valid, then we can already execute it by just iterating over the tokens and computing the result.

```ts
const naiveInterprete = (tokenList: string[], context: Record<string, number>, acc: number): [number, string[]] => {
  const [token, ...tokens] = tokenList;
  console.log(token, tokens, isNaN(Number(token)));

  if (!isNaN(Number(token))) {
    const operatorAhead = ["+", "-", "*", "/"].includes(tokens[0]);
    
    if (operatorAhead)
      return naiveInterprete(tokens, context, Number(token));

    return [Number(token), tokens];
  }

  if (token === "print") {
    const openbraces = tokens[0];
    const [result, [closebraces, ...remaining]] = naiveInterprete(tokens.slice(1), context, 0)
    console.log(result);
    return [result, remaining];
  }

  if (token === "let") {
    const variable = tokens[0];
    const equal = tokens[1];
    const [value, [semicolon, ...remaining]] = naiveInterprete(tokens.slice(2), context, 0);
    return naiveInterprete(remaining, {[variable]: value, ...context}, 0);
  }

  if (token === "+") {
    const [value, remaining] = naiveInterprete(tokens, context, 0); 
    return [acc + value, remaining];
  }

  if (token === "-") {
    const [value, remaining] = naiveInterprete(tokens, context, 0); 
    return [acc - value, remaining];
  }

  if (token === "*") {
    const [value, remaining] = naiveInterprete(tokens, context, 0); 
    return [acc * value, remaining];
  }
    
  if (token === "/") {
    const [value, remaining] = naiveInterprete(tokens, context, 0);
    return [acc / value, remaining]
  }

  return [context[token], tokens];
};
```

One crucial point that you must notice in this example is that it do not have arithmetic precedence, if we run "4 * 2 - 3 * 2" the result will be -16. Adding rules of how to compute these tokens will grow the complexity of this interpreter really quickly because the more complex the rules that you follow, the more specific the implementation will need to be to these rules.

So it's really useful to transform this data into a structure easier to apply rules, this step is called *parsing*. There are a lot of strategies to do that, usually we represent it as trees because this way it keeps natural to apply rules over the precedence of the evaluation.

```js
// definition of the let as a tree and the next operations are inside it,
// tokens that are not useful at this point like braces and semicolons are discarted.
{ node: "let",
  var: "x",
  value: { node: "sum", left: 2, right: 3 },
  next: { node: "print", value: { node: "variable", value: "x" } } }
```

There is an example of how to write a parser that transforms the tokens sequence into a tree.

```ts
type Value = { node: "number", value: number }
           | { node: "variable", value: string };

type LowOperator = { node: "sum"
                     left: Value
                     right: LowOperator }
                 | { node: "subtraction"
                     left: Value
                     right: LowOperator }
                 | Value;

type HighOperator = { node: "multiply"
                      left: LowOperator
                      right: HighOperator }
                  | { node: "division"
                      left: LowOperator
                      right: HighOperator }
                  | LowOperator;

type Let = { node: "let"
             variable: string
             value: HighOperator
             next: Print }
         | HighOperator;

type Print = { node: "print"
               value: HighOperator }
           | Let;

const parseValue = (tokenList: string[]): [Value, string[]] => {
  const [token, ...tokens] = tokenList;
  
  if (isNaN(Number(token)))
    return [{ node: "variable", value: token }, tokens];

  return [{ node: "number", value: Number(token) }, tokens];
};


const parseLowOperator = (tokenList: string[]): [LowOperator, string[]] => {
  const [left, tokens] = parseValue(tokenList);

  if (tokens.length === 0) {
    return [left, tokens];
  }

  const [operator, ...rest] = tokens;

  if (operator === "*") {
    const [right, remainingTokens] = parseLowOperator(rest);
    return [{ node: "multiply", left, right }, remainingTokens];
  }

  if (operator === "/") {
    const [right, remainingTokens] = parseLowOperator(rest);
    return [{ node: "division", left, right }, remainingTokens];
  }

  return [left, tokens];
};

const parseHighOperator = (tokenList: string[]): [HighOperator, string[]] => {
  const [left, tokens] = parseLowOperator(tokenList);

  if (tokens.length === 0) {
    return [left, tokens];
  }

  const [operator, ...rest] = tokens;

  if (operator === "+") {
    const [right, remainingTokens] = parseHighOperator(rest);
    return [{ node: "sum", left, right }, remainingTokens];
  }

  if (operator === "-") {
    const [right, remainingTokens] = parseHighOperator(rest);
    return [{ node: "subtraction", left, right }, remainingTokens];
  }

  return [left, tokens];
};

const parseLet = (tokenList: string[]): [Let, string[]] => {
  const [token, variable, equal, ...operator] = tokenList;
  if (token === "let" && equal === "=") {
    const [value, [semicolon, ...print]] = parseHighOperator(operator);
    const [next, remaining] = parse(print);
    return [{ node: "let", variable, value, next }, remaining];
  }

  return parseHighOperator(tokenList);
};

const parse = (tokenList: string[]): [Print, string[]] => {
  const [print, openbraces, ...tokens] = tokenList;
  if (print == "print") {
    const [value, [closebraces, semicolon, ...remaining]] = parseHighOperator(tokens);
    return [{ node: "print", value }, remaining];
  }
  
  return parseLet(tokenList);
};
```

At first sight it seems a lot messier than the "naiveInterpreter" implementation but there a lot of advatages that this method gives to us. The biggest one is that this method is modular, each structure of the language has their own parsing logic and it doesn't depends on the other structures.

```js
{ node: "let",
  var: "x",
  value: { node: "sum", left: 2, right: 3 },
  next: { node: "print", value: { node: "variable", value: "x" } } }
```

Another thing about this implementation is that it fixed the broken precedence of "naiveInterpreter". Since it has independent logics to high and low precedence operations, it can build the tree representing the right precedence of the operations.

Some languages adds more metadata to this tree like the location of every token on the original source string, this would help the language to give better error messages. It could add the type of each value and expression of the language, if we had types on the tree then it would be possible to create a *type checker*.

With a tree representing our code we can now compute over the program a lot easier, to execute our program we just need to navigate over the tree applying the language execution logic to each node.

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

Here we would first get the node "let" and navigate to its "value" node, here we can execute the "sum" node and then store the result as the "value" of the let on the memory using the "var" value as a key to access it later.

Navigating to the "next" we would find the "print" node where the "value" is the variable "x" in the context and then printing the result of the earlier sum.

This way we *interpreted* the code only navigating the tree and using it to manipulate a context. This way we made a simple version of a tree-walking interpreter for our language snippet.

But this tree structure keeps easier to transform it into another forms of data too, like another languages. We could compile the "let" node into a valid snippet of lua, navigating over the tree and accumulating a source string like [this compiler project](https://github.com/bronen/luajit-rinha-de-compiler).

```lua
-- This way the result would be something like this.
local x = 2 + 3
print(x)
```

This way instead of parsing the data into a more abstract version, we compile into a more concrete one.

