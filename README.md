# Patch-Based Incremental Computation

TypeScript library for incremental computation where
the changes on the inputs and outputs are expressed as "patches".

This is a workspace with 3 packages:

- [`patch-incr`](packages/patch-incr/README.md): Library for patch-based incremental computation
- [`patch-incr-dom`](packages/patch-incr-dom/README.md): Incremental DOM manipulation library
- [`patch-incr-dom-examples`](packages/patch-incr-dom-examples/README.md): Example frontend apps using `patch-incr-dom`

## Setting up

Install Bun.

```bash
bun install
```

## Running the tests

```bash
cd packages/patch-incr
bun test
```

## Running the server

```bash
cd packages/patch-incr-dom-examples
bun server/server.ts
```

Visit:
 - [http://localhost:3000/todo]: TodoMVC app example
 - [http://localhost:3000/bench]: JS framework benchmark example
