# patch-incr-ijq

Ijq is a type-safe and incrementalized subset of the `jq` programming language.

An Ijq function `A => B` running on context of type `Ctx` is a combination 
of the list monad and the reader monad

The *reader monad* `Ctx` exists to handle the passing of named variables 
`expr as $Var` syntax.

The *list monad* is used to generate a sequence
of results, such as `.items[].field`.

Error handling is done through JavaScript exceptions instead of an
either-type in the return value.

```ts
interface Ijq<A, B, Ctx> {
  func: IF<[A, Ctx], B[]>
}
```

In Haskell, the non-incrementalized version is:

```haskell
type IjqM b ctx = ReaderT ctx [] b
runIjqM :: IjqM b ctx -> ctx -> [b]
runIjqM = runReaderT

type Ijq a b ctx = (a, ctx) -> IjqM b
runIjq (a, c) f = runIjqM f c

instance Arrow Ijq where 
  ...
```
