# Incremental Monads and Arrows

There are incremental counterparts for monadic computations.

Since incremental functions deal with `A -> Monad<B>` instead of `Monad<B>`,
we need to use the concept of **arrows** to express monadic incremental
computations.

Most monadic typeclasses we know of must be adapted by replacing `->` into `IF` in the right places after uncurrying them.

Since the input type is inseparable in `IF`, monadic computations are actually represented as arrows.

- Functor -> Profunctor
- Applicative -> Monoidal
- Monad -> Arrow

Incremental monads can be used to create a unified and optimized interface for composing incremental functions.

Monad transformers can exist for `IF` as well.

## Typical module for incremental monadic computations

An incremental monad must support the monadic equivalents of the typical `IF` operations.

The following list is based on Haskell's `Control.Arrow` package, mostly based on `Arrow` and `ArrowChoice` typeclasses.

```typescript
namespace M {
  // Arrow type
  type M<A, B> = ...;
  
  // id
  declare const identity: <A>() => M<A, A>;
  // returnA
  declare const constant: <I, A>(value: A) => M<I, A>;
  
  // pure
  declare const fromAtomic: <A, B>(func: (input: A) => B) => M<A, B>;
  
  // arr
  declare const fromIF: <A, B>(func: IF<A, B>) => M<A, B>;
  
  // (>>>)
  declare const compose: <A, B, C>(f1: M<A, B>, f2: M<B, C>) => M<A, C>;
  
  namespace Pair {
    declare const first: <A, B, A1>(f1: M<A, A1>) => M<[A, B], [A1, B]>;
    declare const second: <A, B, B1>(f2: M<B, B1>) => M<[A, B], [A, B1]>;
    
    // (***)
    declare const firstSecond: <A, B, A1, B1>(f1: M<A, A1>, f2: M<B, B1>) => M<[A, B], [A, B1]>;
    
    // (&&&)
    declare const pair: <A, B, C>(f1: M<A, B>, f2: M<A, C>) => M<A, [B, C]>;
    
    // assocRight, assocLeft, swap, ...
  }
  
  namespace Either {
    declare const left: <A, B, A1>(f1: M<A, B>) => M<Either<A, B>, Either<A1, B>>;
    declare const right: <A, B, B1>(f2: M<B, B1>) => M<Either<A, B>, Either<A, B1>>;
    
    // (+++)
    declare const leftRight: <A, B, A1, B1>(f1: M<A, A1>, f2: M<B, B1>) => M<Either<A, B>, Either<A1, B1>>;
    
    // leftRight, cond, ...
  }
  
  namespace Array {
    // Array operations
    declare const map: <A, B>(f: M<A, B>) => M<A[], B[]>;
    
    declare const flatMap: <A, B>(f: M<A, B[]>) => M<A[], B[]>;
    
    declare const filter: <A>(pred: (input: A) => boolean) => M<A[], A[]>;
  }
  
  // Struct, Map, etc. ...
}
```

## Example monads

### Reader

```typescript
type Reader<A, B, R> = IF<[A, R], B>
```

The reader monad can be used to maintain a read-only context.
When multiple functions are combined, the same value is being passed.

When traversing a list with `Reader`, the context cannot change throughout the traversal.

### Writer
```typescript
type Writer<A, B, W> = IF<A, [B, W]>
```

In Haskell, the writer monad accumulates an "output" throughout
the monadic computation. The accumulated value must be a monoid.

### Residual

```typescript
type Residual<A, B, W> = IF<A, [B, W]>
// type Residual<A, B> = exists W. Residual<A, B, W>
```

In incremental computation, a modified version of the writer monad can be used to track the residuals of functions in the form of `IF<A, [B, W]>`.
The accumulated value must be in a particular type (the "`exists W`" requirement) that can be decomposed by the `forward` function.

### State
```typescript
type State<A, B, S> = IF<[A, S], [B, S]>
```

In each step of the state monad, the state value can be modified.

The difficulty of incrementalizing the state monad is that traversing a list requires chaining the state with an expensive `scan` operation to remember the intermediate state values. A list item changing in the middle results in the re-computation for rest of the list.

If the collection is unordered, the traversal is undefined in general since the resulting state can differ based on the actual traversal order.

### List
```typescript
type List<A, B> = IF<A, B[]>
```

The list monad allows a computation to return multiple results.

This monad is used to implement the streaming execution model of the `jq` language.

## Monad/arrow transformers

Suppose `M` is the inner monad (or `IF` itself for the identity monad), we can hold the inner monad in the transformer.

```typescript
interface WriterT<A, B, W> {
  inner: M<A, [B, W]>
}

interface ResidualT<A, B, W> {
  inner: M<A, [B, W]>
}

interface ReaderT<A, B, R> {
  inner: M<[A, R], B>
}

interface StateT<A, B, R> {
  inner: M<[A, R], B>
}

namespace M {
  declare const identity: <A>() => M<A, A>;
  declare const constant: <I, A>(value: A) => M<I, A>;
  declare const fromIF: <A, B>(func: IF<A, B>) => M<A, B>;
  declare const compose: <A, B, C>(f1: M<A, B>, f2: M<B, C>) => M<A, C>;
  declare const first: <A, B, A1>(f1: M<A, A1>) => M<[A, B], [A1, B]>;
  declare const second: <A, B, B1>(f2: M<B, B1>) => M<[A, B], [A, B1]>;
  // ...
}

namespace ReaderT {
  const compose = <A, B, C, R>(f1: ReaderT<A, B, R>, f2: ReaderT<B, C, R>) => {
    return {
      inner: M.compose(f1.inner, f2.inner)
    }
  }
  
  // ...
}
```

Due to lack of higher-kinded types, it might be more practical to create a pre-composed version of the monad transformer. 

For example, the monad for the incremental jq language is:

```typescript
// list + reader monads
interface Ijq<A, B, Ctx> {
  func: IF<[A, Ctx], B[]>
}
```
## Efficiently composing monad transformers

Since there are many incremental functions not depending on the monad behavior,
we can introduce a union type for the monadic vs. non-monadic versions, while
optimizing the "compose" function.

For example:

 - If the reader monad doesn't depend on the context, we can avoid using `distl` for array `map` and `flatMap` operations
 - If the list monad returns only a single value (or is a "maybe": zero or one value), we can avoid a `flatMap` while composing them.

This optimization makes the arrow operations harder to read and write.

```typescript
type Reader<A, B, Ctx> = 
  | { reads: false, func: IF<A, B> }
  | { reads: true, func: IF<[A, Ctx], B> }
  
type List<A, B, Ctx> = 
  | { listKind: 'single', func: IF<A, B> }
  | { listKind: 'maybe', func: IF<A, Maybe<B>> }
  | { listKind: 'multi', func: IF<A, B[]> }
```
