# patch-incr-adt

Algebraic data types for patch-based incremental computation.

Provides a schema-like API for constructing the change-types of various data types.

```ts
import * as s from "patch-incr-adt"
const todoItem = s.record({
  done: s.boolean(),
  text: s.string(),
});

type TodoItem = s.infer<typeof todoItem>
type DTodoItem = s.inferChange<typeof todoItem>
```

## Introduction

Consider `y = f(x)`. If an incremental change is made to `x`, we want to determine the incremental change made to `y`
so that `y` is only partially re-computed.

In patch-based incremental computation, data types have "patches" on them, and incremental functions have their "derivatives" where a patch on the input `dx` can be converted to the patches on the output `dy`.

There are two parts of this module:

 - *Incremental data types*: A schema-like API for constructing data types and their change-types.
 - *Incremental functions*: Functions between two incremental data types and combinators to compose between them.

## Incremental data types

### Change types and the `Apply` interface

A data type `T` has their internal changes of type `DT`. Let `@` be the apply-change operator and `<>` be the combine-change operator.
A change-type (or patch) must satisfy some basic properties:

 - There is a null-change that does nothing: `x @ empty = x`
 - Two changes can be composed together associatively: `(a <> b) <> c = a <> (b <> c)`
 - There must be a replace-all change: `x @ Replace(y) = y`

The interface `Apply<T, DT>` captures this relationship.

```ts
interface Apply<T, DT> {
  empty: DT
  fromReplace: (replacement: T) => DT
  apply: (value: T, change: DT) => T
  combine: (a: DT, b: DT) => DT
  // isEmpty, isReplace, canApply, canCombine, ...
}
```

### Algebraic data types

Data types can be creates in terms of other types, and their change-types can be automatically derived as well.

There are 4 core traits of algebraic data types. Incremental computation must be able to handle them:

 - Atomic type
 - Product type
 - Sum type
 - Recursive type

#### Atomic type

An atomic data type has no internal changes, therefore the only change-type are empty and replace.

Examples include booleans, numbers and strings.

In most derived types, `null` represents the empty change and `ReplaceOnly<T>` represents a replace-patch.

The type `DRO<T>` is a shorthand for `ReplaceOnly<T> | null`. All atomic types and most derived types have `DRO<T>` as part of the change type
to implement the empty/replace part of the `Apply` interface.

```ts
import * as s from "patch-incr-adt"

const b = s.boolean();
// s.$T<typeof b> = boolean
// s.$D<typeof b> = DRO<boolean>

const str = s.string();

const num = s.number();

const customType = s.atomic<'a' | 'b'>();
// s.$T<typeof customType> = 'a' | 'b'
// s.$D<typeof customType> = s.DRO<'a' | 'b'> = s.ReplaceOnly<'a' | 'b'> | null

// Internal changes disregarded
const atomicObject = s.atomic<{ a: string, b: boolean }>();
```

#### Constant type

The constant type is an atomic type with only one member. The change type is `null` by default. This is similar to Zod `literal` types.


```ts
const nullLiteral = s.constant(null);
const falseLiteral = s.constant(false);
// s.$T<typeof falseLiteral> = false
// s.$D<typeof falseLiteral> = null
```

#### Product type

A product type is a type made of multiple existing types. In JavaScript, we often represent product types with an object or a tuple.

A product type has a "shape" describing its compnents.

```ts
import * as s from "patch-incr-adt"

const todoItem = s.record({
  done: s.boolean(),
  text: s.string(),
});

// The shape of todoItem is { done: AAtomic<boolean>, text: AAtomic<string> }
// The type of todoItem is ARecord<{ done: AAtomic<boolean>, text: AAtomic<string> }, 'done' | 'text'>

// { done: boolean, text: string }
type TodoItem = s.$T<typeof todoItem>

// { done: DRO<boolean>, text: DRO<string> } | DRO<TodoItem>
type TodoChange = s.$D<typeof todoItem>

const tuple1 = s.tuple([s.boolean(), s.string(), s.number()])

const pair1 = s.pair(s.string(), s.number())
// s.$T<typeof pair1> = [string, number]
// s.$D<typeof pair1> = [s.DRO<string>, s.DRO<number>] | s.DRO<[string, number]>

```

#### Union type

A union type has one or more disjoint cases, and each cases has a "tag". Similar to product types, there is a "shape" describing its constituent parts.

A union type must have a discrimant function to determine its tag based on the value.

Internal changes can happen within a union-case, but if a change switches a case, the change must replace the value entirely.

```ts
import * as s from "patch-incr-adt"

const union1 = s.union({
  str: s.string(),
  bool: s.boolean(),
}, (val: string | boolean): 'str' | 'bool' => typeof val === 'string' ? 'str' : 'bool')

// string | boolean
type UnionValue = s.$T<typeof union> 

// { type: 'str', change: DRO<string> } | { type: 'bool', change: DRO<boolean> } | DRO<string | boolean>
type UnionChange = s.$D<typeof union> 

````

## Incremental functions

```ts
interface IF1<A, B> {
  evaluate: (x: $T<A>) => $T<A>
  forward: (x: $T<A>, dx: $D<A>, y: $T<B>) => $V<B>
  // ...
}
```

Most of the library assume a point-free style of building incremental functions.
