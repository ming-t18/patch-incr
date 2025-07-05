# `incr`: Patch-Based Incremental Computation

To install dependencies:

```bash
bun install
```

To run the server for the TodoMVC example:


```bash
bun run server/server.ts
```

and visit http://localhost:3000/

This project was created using `bun init` in bun v1.1.37. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# Introduction

Incremental computation is the practice of optimizing computations from the input to the output when the input is changed incrementally.

Incremental computation is used in many places of the real world, such as:
 - Programming language tooling: Build tools and language servers
 - JavaScript rendering frameworks (React, Angular, etc.)
 - Spreadsheets

Patch-based incremental computation is a sub-category of incremental computation where there is a data type representing the changes on the inputs or outputs and the incremental function computes the output change based on the input change.

In reducer-based state management, the "change type" is the reducer action, while
for JavaScript data in general, we can represent changes with JSON Patches.

`incr` is a combinator library for creating and composing incremental functions.
The combinator-based approach allows us to avoid running diffing algorithms on
the before and after outputs, but the disadvantages of this approach are:

 - Locked into the point-free style of programming
 - Incremental functions are difficult to write and get correct

# Building blocks of patch-based incremental computation

## Patchable types

An implementation of `ApplyCombine<X, DX>` represents a type `X` with
changes ("patches") of type `DX`.

All change types must support:
- the "empty" change (no-op)
- the replace change (replace the entire value)
- the composition between two changes

```typescript
interface ApplyCombine<X, DX> {
    apply: (value: X, change: DX): X
    empty: DX
    compose: (left: DX, right: DX): DX
    // `compose` is associative
    // `empty` is:
    //  - identity element of `apply`
    //  - left identity of `compose`
    //  - right identity of `compose`

    fromReplace: (value: X): DX

    isEmpty: (change: DX) => boolean

    // is a particular change a replace-only? Gets its value or null
    isReplace: (change: DX) => ReplaceOnly<Value> | null;
}

```

The type `DRO<T>` is a change type with either empty change or the replace-only change `ReplaceOnly<T>`.

### JSON Patches

JSON Patches are a commonly used change type throughout this library. The library
supports JSON Patches as handled by the Immer library, including the support
for `Map` and `Set`.

The type `Patches<T>` is the type of JSON Patches on the type `T`. The function
`applyPatches<T>(value: T, patches: Patches<T>): T` performs patch application.

## Incremental function

A patch-based incremental function has two methods:
 - `evaluate` for evaluating
the output and
 - `forward` for determining the output change given the input, input change and the output.

```typescript
interface IF<
    Input, Output,
    InputChange = Patches<Input>,
    OutputChange = Patches<Output>
> {
    evaluate: (input: Input) => Output
    forward: (input: Input, inputChange: InputChange, output: Output) => OutputChange
}
```

### Rules for incremental functions

Both `evaluate` and `forward` must be pure functions with persistent immutable coding style:
 - Do not mutate the input arguments
 - Avoid shallow or deep cloning the unchanged parts of the object when computing the output
 - Must be pure functions: Same input leads to same output, and no visible global state changse

Rules for `forward`:
 - If the input change is a replace (`isReplace(dx) !== null`), return a replace-patch (`fromReplace`) as the output
 - Return the most fine-grained output patches as possible if the input change is not a replace-change
 - If `IF`s are constructed by factories, avoid reconstructing them as much as possible

By default, the expectations of correctness are based on deep equality between two objects, or type-specific deep equality if specialized colletion types are involved (`Map`, `Set`, or ImmutableJS types)

### Patch coherence

An `IF` must be patch coherent. The **patch coherent** property specifies the contract on the incremental function.

```typescript
// f(x) @ dy = f(x @ dx) where dy = f'(x, dx, y)
const y = f.evaluate(x)
const dy = f.forward(x, dx, y)
assertEquals(apply_DY(y, dy), f(apply_DX(x, dx)))
```

where `apply_DX, apply_DY` are the respective change-applying functions.

As a consequence, if the input change is an empty change, the output must be an empty change as well.

# Incremental computation combinators

This is a quick overview of how incremental computation functions and combinators work.

## Creating structures: Tuples and records

## Array operations

### Map

### Filter

## Function composition

### `compose`

### Memoing the intermediate value: `composeMemoL`, `composeMemoR`

## Escape hatches
### The "let" statement: `bind`

### Avoiding incrementality: `atomicFunc`
