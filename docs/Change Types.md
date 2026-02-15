# Change Types

In patch-based incremental computation, a type `T` has its incremental changes expressed in another type `DT`.

A change type is a monoid and must support the replace-all change.

```typescript
declare const empty : <T>() => Patches<T>;

declare const replace : <T>(value: T) => Patches<T>;

declare const combine : <T>(f: Patches<T>, g: Patches<T>) => Patches<T>;

// can throw error on invalid patch applications
declare const applyPatches: (value: T, change: Patches<T>) => T;
```

## Patch laws

Let `@` be `applyPatches` and `<>` be `combine`.

```typescript
x : T
f, g, h : Patches<T>

// Empty
empty <> f = f <> empty = f
x @ empty = x

// Assoc
f <> (g <> h) = f <> (g <> h)

// Replace
x @ replace(y) = y
replace(x) <> replace(y) = replace(y)
replace(x) <> y = replace(x @ y)
f <> replace(y) = replace(y)
  
// Apply
(x @ f) @ g = x @ (f <> g)
```

## Patches

In the bulk of the `patch-incr` library, we use Immer-style patches, 
`Patches<T>`.

## Redux-style reducers

In Redux, a state `S` is changed by a reducer of action type `A`.
The change type of a reducer is `A[] | { replace: S }`.

To satisfy the monoid property, a list of actions is provided, and to satisfy
the replace-type, the replace-case is introduced.
