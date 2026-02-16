# Functiona Composition and Residuals

The incrementalized versions of a function `A -> B` often need to return something "extra"
in the return value (`IF<A, [B, W]`>), such as the cumulative sum array of the filter.

We call the "extra" thing is called the **residual**.

Composing two incremental functions also creates a residual for the intermediate value
so the first function doesn't have to be re-evaluated in the `forward` method.

```typescript
compose : <A, B, C>(f1: IF<A, B>, f2: IF<B, C>): IF<A, [C, B]>
```
The residual value worsens API ergonomics and tend to complicate type checking.

## Re-evaluating functions

If `f1` or `f2` are cheap to re-evaluate, we can use a composer that re-evaluates `f1` or `f2`.

```typescript
// Re-evaluates f1.evaluate in the forward
composeReeval : <A, B, C>(f1: IF<A, B>, f2: IF<B, C>): IF<A, C>

// IFInv derives the value of B given the value of C.
composeWithInv : <A, B, C>(f1: IF<A, B>, f2: IFInv<B, C>): IFInv<A, C>
```

## Memoing the function

If the input type is a reference type, we can memoize the result of `f1` with a `WeakMap`.

```typescript
composeMemo : <A extends WeakKey, B, C>(f1: IF<A, B>, f2: IF<B, C>): IF<A, C>
```

## Dependency graph composition
If an function is composed in terms of a directed acyclic graph of `n` intermediate variables, 
then it is possible to  create function composer with an array of `n` residual values.

The return value is an array of the intermediate results. The `evaluate` and `forward` will
run the intermediate functions in dependency order, using the residuals array as the input and output.

The `fromGraph` function from `"patch-incr/builder/graphBuilder"` is an example of composing functions
using the graph-based approach.

```typescript
composed :: IF<A, [R0, R1, ...]>
```
