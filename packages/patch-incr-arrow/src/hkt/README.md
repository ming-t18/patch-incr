# Higher-kinded types

This module contains helpers for dealing with higher-kinded types (HKTs)
with up to  4 type parameters.

HKTs are represented as branded types with no additonal runtime representation.

Unlike the ML counterpart, there are `inj/prj` functions for explicitly converting
between types in HKT forms and their resolved types.

Information is retained on HKTs so unresolved HKTs can be resolved later on.

The `$1, $2, $3, $4` are generic functions for performing type applications,
named after the number of arguments.

The `$Map1, $Map2, $Map3, $Map4` are interfaces containing the mappings from
type applications to their corresponding types.

The `$1-$4` results in the corresponding type from `$Map1-$Map4`, with
a branded type `$Brand<...>` to indicate the type application.

The `Tuple` generic type is available for constructing tuples
through higher-kinded types from 1 to 4 elements.

```ts
// [string, number] & $Brand<...>
type Test1 = $2<'Tuple', string, number>
```

## Kind Notation

Kinds are "types of types", and a higher-kinded type is a "function on types".

`*` is a concrete type. 
For all value `x` and its type `T`, `T` must have the kind of `*`. (`x : T, T : *`)

A higher-kind type has a signature described in a function-like notation `Args -> Ret`,
where `Args` are the argument types are `Ret` is the returning kind.

A generic collection type (such as array) has kind `* -> *`.

If `*` is repeated multiple times, a number is appened after it: `*1, *2, *3` and so on.

An arrow has kind of `*2 -> *`. The `2` stands for `*` repeated twice.

The kind alias for incremental arrow `*2 -> *` is `A`.

An arrow transformer has kind `A -> A`, or `(*2 -> *) -> (*2 -> *)`. Examples of arrow transformers:
 - `$<Reader, [Ctx]>`
 - `List`
 - `$<Writer, [W]>`
 - `$<Residual, [R]>`
 - `$<State, [S]>`

The reader arrow transformer has `* -> A -> A`.

This library cannot check for kind-correctness.

## Currying

It is possible to partially apply higher-kinded types as long as there is
no entry in `$Map1-$Map4`.

Let `$` be one of `$1-$4`, and `Xs, Ys` be lists of type parameters.

The combined list of type parameters `...Xs, ...Ys` must 
have length between 1 or 4 inclusive.

`$<$<F, ...Xs>, ...Ys>` === `$<F, ...Xs, ...Ys>`

Example: 
```ts
// [string, number] & $Brand<...>
type Test1 = $1<$1<'Tuple', string>, number>
```
