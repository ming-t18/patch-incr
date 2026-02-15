# Incremental jq

Incremental jq, or `Ijq`, is an incrementalized and statically typed version of the jq programming langauge.

jq is a point-free programming language with a streaming model.

## Syntax of jq

| Label | Syntax | Filter Type | Input Types |
|---|---|---|---|
| Constant | `c` | `Ijq<A, B, C>` | `c : B` |
| Identity | `.` | `Ijq<A, A, C>` | |
| Access | `.[f]` | `Ijq<A, V, C>` | `A : { [K]: V }, f : Ijq<A, V, C>` |
| Empty | `empty` | `Ijq<A, V[], C>` | |
| Stream | `.[]` | `Ijq<V[], V, C>` |  |
| Collect | `[f]` | `Ijq<A, V[], C>` | `f : Ijq<A, V, C>` |
| Select | `select(f)` | `Ijq<A, A, C>` | `f : Ijq<A, boolean, C>` |
| Concat | `f, g` | `Ijq<A, B, C>` | `f, g : Ijq<A, B, C>` |
| Pipe | `f \| g` | `Ijq<A, B, C>` | `f : Ijq<A, D, C>, g : Ijq<D, B, C>` |
| Conditional | `if f then g else h` | `Ijq<A, B, C>` | `f : Ijq<A, boolean, C>`; `g, h : Ijq<A, B, C>` |
| Binop | `f OP g` | `Ijq<A, B, C>` | `OP : [L, R] -> B, f : Ijq<A, L, C>, g : Ijq<A, R, C>` |
| Assign | `f \|= g` | `Ijq<A, B, C>` |  |
| Context | `f as $x \| g` | `Ijq<A, B, C>` | `f : Ijq<A, D, C>, g : Ijq<A, B, C & { [x]: D }>` |
| Context Access | `$x` | `Ijq<A, V, C>` | `C : { x: V }` |
| Reduce | `reduce f as $x (init; op)` | `Ijq<A, B, C>` | `f : Ijq<A, D[], C>, init : Ijq<A, R>, op: Ijq<A, R, C & { [x]: D }>` |
| Foreach | `foreach f as $x (init; op)` | `Ijq<A, B, C>` | `f : Ijq<A, D[], C>, init : Ijq<A, R>, op: Ijq<A, R, C & { [x]: D }>` |

## Incremental extensions to jq

- Support for any datatype atomically -- required for callbacks and HTML elements
- Convert any `IF` (context-dependent or contextless) to `Ijq`
- `Map` and `Set` operations

## Monadic structure

To express jq filters, we need the **reader** monad for maintaining the context and the **list** monad for streaming the inputs and outputs.

The type of a filter is essentially `IF<[A, Ctx], B[]>`.

Since `Ijq<A, B, Ctx>` is a monadic computation from `A` to `B`, `Ijq` forms an **arrow**.
