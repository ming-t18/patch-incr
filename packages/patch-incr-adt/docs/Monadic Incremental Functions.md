# Monadic Incremental Functions

Incremental functions can exhibit monadic behaviors, which are represented using
using **Kleisli arrows**. The monadic behaviors can be stacked together with 
arrow transformers but this library has a pre-composed stack to avoid designing
an API with higher-kinded types.

To reduce the overhead of composing non-monadic functions, arrow transformers
are represented using multi-case unions.

The jq language is a JSON processor with a point-free syntax and an execution
semantics requiring the reader monad (context variables: `$var`) and the 
list monad (streaming `.[]`). 

The `Ijq` arrow in this library allows the semantics of Ijq to be captured.

## In TypeScript

For demonstration purposes, the type constraints are omitted and the union cases 
are simplified.

```ts

// Residual
type IF<A, B> = IFA<A, B> | IF1<A, B> | IFR<A, B, /* Residual */ unknown>

// Reader (context passing)
type IReader<Ctx, A, B> = { lift: IF<A, B> } | { reads: IF<APair<A, Ctx>, B> }

// Ijq (context passing + multiple outputs)
type Ijq<Ctx, A, B> = { lift: IReader<Ctx, A, B> } | { multi: IReader<Ctx, A, AArray<B>> }
```

## In Rust

In a language where there's no overhead to represent the unit type, the 
Residual and Reader monads can be baked into all incremental functions.

```rs
pub trait IF<A, B, Ctx = (), Residual = ()> 
  where A : ApplyChange, B : ApplyChange, Ctx: ApplyChange, Residual : ApplyChange {
  fn evaluate(input: &A) -> B;
  fn forward(
    pair: (&A, &Ctx), 
    d_pair: (&A::Change, &Ctx::Change), 
    output: &B
  ) -> B::Change;
}

pub trait ApplyChange {
  type Change;
  // ...
}
impl ApplyChange for () {
  type Change = ();
  // ...
}
```

### With `Result` type

If `Result` type is returned and we do not need incrementality for the `Result`,
the signature for `evaluate` can be modified.

```rs
pub trait IFResult1<A, B, Ctx = (), Residual = (), Err = ()> 
  where A : ApplyChange, B : ApplyChange, Ctx: ApplyChange, Residual : ApplyChange {
  fn evaluate(input: &A) -> Result<B, Err>;
  fn forward(
    pair: (&A, &Ctx), 
    d_pair: (&A::Change, &Ctx::Change), 
    output: &B // no Err
  ) -> B::Change;
}
```

If `Result` is treated as union type:

```rs
pub trait IFResult2<A, B, Ctx = (), Residual = (), Err = ()> 
  where A : ApplyChange, B : ApplyChange, Ctx: ApplyChange, Residual : ApplyChange {
  fn evaluate(input: &A) -> Result<B, Err>;
  fn forward(
    pair: (&B, &Ctx), 
    d_pair: (&A::Change, &Ctx::Change), 
    output: &Result<B, Err> // Err is handled
  ) -> B::Change;
}
```
