# Introduction to Patch-based Incremental Computation without Code

This document serves as an introduction to patch-based incremental computation without any code.

## Problem Domains

### Web Frontend and UIs in general

### JSON transformation (jq)

### Database views

### Compiler and programming language tooling

A compiler converts from a source code to an executable,
with multiple intermediate steps.

Typical pipeline:
 - Source code
 - Tokens
 - Syntax tree
 - Symbols
 - ...
 - Compiled output

A language tooling enables auto-complete and real-time type checking, and it often requires incrementalization to be fast and responsive to a developer.

Tree-sitter is an incremental parser designed to quickly re-build the syntax tree based on the incremental changes to the source code.

Anywhere between symbols and compiled output tend not to be incrementalized, except at a "compilation unit" level such as file or "module".

 - Source code: A variable on line 15 is renamed
 - Tokens: Code is re-parsed
 - Syntax tree: Syntax tree is updated
 - ...

### Build system

A build system takes source files and compiles them into
a build artifact (executable, transpiled files, etc.).

A developer often makes incremental changes to the code,
and a build system needs to optimize the incremental
performance by minimizing the parts of the code to be rebuilt.

Example (C/C++):
 - Source files
 - Object files (for each source)
 - Executable or library

## Pure and impure incremental functions

Computer programs can affect the outside world by observing or modifying the outside world. We often call them "side effects". Side effects can consume resources, affect the results of programs (including the program itself and other programs).

A function without side effects is called a pure function. Purity and side effects are vaguely defined terms with specific definitions depending on the problem domain.

There are two kinds of side effects:
 - Query: Makes an observation on the real world, and does not change it
 - Mutation: Changes the real world.

An idempotent mutation has no side effects and returns the same result 
after evaluating it the second and subsequent times.

Only idempotent mutations can be meaningfully incrementalized.

In general, idempotent mutations are designed to enforce a "desired state".

Examples:
 - Copying files from one place to another
 - Build systems: compiling the executable given unchanged input

## Change types or patches: Describing how the input changes

A data type `T` having a "change type" `DT` describing changed made on `T` is the defining trait of patch-based incremental computation.

Functions from `T` to `T` itself ("endomorphisms") can be used to represent all
changes, but functions are black boxes that cannot be analyzed.

Instead we must create a data type `DT` to "behave" like a function `T -> T`:

 - There is a constant function: `(k(c : T))(x : T) = c`
 - There is an identity function: `id(x : T) = x`
 - Functions can be composed: `f(g(x)) = (f . g)(x)`
   - Composition is associative: `(f . g) . h = f . (g . h)`

For each change-type `DT`, there is an  `apply` function to apply the changes:
`t1 : T = apply(t0: T, dt: DT)`.

### The replace-change

The replace-change replaces the entire value with a new value.

The replace-change behaves like a constant function.

### Monoid

Changes are composable from multiple smaller changes.

It is possible to have no changes at all: The empty change must exist.

Change composition must be associative but is not necessarily commutative.

This mathematical structure is called a monoid.

### Examples

#### Texts and strings

Texts can be indexed by the character instead of line/column.

 - Insert: Add text at location
 - Delete: Delete a span of text at location
 - Splice: Replace a span of text at location with a new piece of text at the same location
 
Insert and Delete can be expressed in terms of Splice. For example, a splice with empty
replacement is a delete.
 
#### File system
The state of a file system has the change type of:
 - Add: Add file at a specified path with the specified file contents
 - Delete: Delete a file at a specified path
 - Replace: Replace the contents of a file at a specific path
 - Create a directory
 - Delete a directory recursively
 - Move file from source path to destination path
 - Delete file from source path to destination path

Not all computations can handle the "move" operation, so they can be converted into a delete and add.

## Algebraic data types

### Atomic types

An atomic type have no internal structure therefore have only empty and replace changes.

Examples: unit type, boolean, integer

The change type for a unit type is a unit type, since a unit type cannot change.

### Product: Tuples and records

A product type of `T1...Tn` must be constructed from a value for each `t1: T1, ... tn: Tn`.

We will consider the pair type `(A, B)`, while longer tuples `(A, B, C)` and records can be constructed in terms of pairs.

Suppose we have change types `DA` for `A` and `DB` for `B`.
The change type of `(A, B)`, `D[(A, B)]` is a pair `(DA, DB)`.

- The empty change of `D[(A, B)]` is `(empty_DA, empty_DB)`.
- The replace-change of `D[(A, B)]` is `(replace_A, replace_B)`.

### Sum: Tagged union

`Left(A) | Right(B)`

- The empty change
- The replace-change
- The within-left change using `DA`
- The within-right change using `DB`

The last two cases, within-left and within-right have restrictions of being applicable to their respective cases.

### Derivation of change type for ADTs in general

```
D[Prod_(i : A) F(i)] = Prod_(i : A) D[F(i)]
D[S] = NoChange + Replace[S] + Sum_(i : A) WithinCase[i][D(i)] where S = Sum_(i : A) F(i)

Let T = A + B(T)
Let DBT = D[B(T)]
Let DT = D[A + DBT]
D[T] = DT
```

### Recursive: Cons list

`List[A] = Nil | Cons(A, List[A])`

Taking the algebraic type literally (`Nil` has no change type):

- The empty change
- The replace-change of `List[A]`
- The within-Cons change of `D[(A, List[A])]`

To avoid the nesting for the within-Cons change:

- The empty change
- The pathed change: At index `n >= 0`, perform a change of type `D[Nil | Cons(A, List[A])]` on it

### Recursive: Binary Tree

### Recursive: Tree with a list of children
