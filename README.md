# `incr`: Patch-Based Incremental Computation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.37. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# Introduction

Incremental computation is an optimized way of performing computations
where incremental changes are performed on the output instead of
recomputing the entire output when incremental changes are performed on
the input.

Patch-based incremental computation is a form of incremental computation
where there is a data type on the incremental changes of values, called
patches.


```typescript
interface Patchable<T, DT> {
    apply: (value: T, change: DT): DT
    empty: DT
    compose: (left: DT, right: DT): DT
    // `compose` is associative
    // `empty` is:
    //  - identity element of `apply`
    //  - left identity of `compose`
    //  - right identity of `compose`
}

```

For example, integers can be `Patchable` based on their additive changes
or multiplicative changes. For JavaScript objects in general, JSON patches
can be used to represent the changes on them.

```typescript
const Additive: Patchable<number, number> = {
    apply: (x: number, y: number): number => x + y,
    empty: 0,
    compose: (x: number, y: number): number => x + y,
};

const Multiplicative: Patchable<number, number> = {
    apply: (x: number, y: number): number => x * y,
    empty: 1,
    compose: (x: number, y: number): number => x * y,
};

import { applyPatches, type Patch } from 'immer';
const JSONPatchable: Patchable<any, Patch[]> = {
    apply: applyPatches,
    empty: [],
    compose: (x, y) => [...x, ...y],
};

```

A patch-based incremental function allows the patches on the output to be
computed based on the input, output and the patches on the input.

```typescript
interface IncrementalFunction<X, Y, DX, DY> {
    evaluate: (input: X) => Y;
    forward: (input: X, dInput: DX, output: Y) => DY;
};

```

The **patch-coherent** property specifies the contract on the incremental function.

```typescript
// f(x) @ dy = f(x @ dx)
const y = f.evaluate(x)
const dy = f.forward(x, dx, y)
equals(apply(x, dy), f(apply(x, dx)))
```
## Immutability and conventions

Both `Patchable` and `IncrementalFunction` require all functions in the
interfaces to be to be pure and non-mutating (similar to how immutability
is expected in React).

`Object.is` or `===` are used to determine
the lack of change.
In other words, avoid cloning the unmodified parts of the data.