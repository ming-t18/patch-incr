# Array Operations

## Changes applies on an array

- `apply(i, dx)`: apply change `dx` on `xs[i]`
- `remove(i)`: remove `xs[i]`
- `add(i, x)`: add `x` to position `i`, displacing `x[i...]` over before adding
- `replace(i, x)`: replace `xs[i]` with a new value `x`

Let `xs : T[] = [...xl, xs[i], ...xr]`
```typescript
[...xl, xs[i], ...xr] @ apply(i, dx) = [...xl, xs[i] @ dx, ...xr]
[...xl, xs[i], ...xr] @ remove(i) = [...xl, ...xr]
[...xl, xs[i], ...xr] @ add(i) = [...xl, xs[i], ...xr]
[...xl, xs[i], ...xr] @ replace(i, x) = [...xl, x, ...xr]
```

## Map

`map(f)` is incrementalized by converting patches on `f` one-by-one.

## Folds and scans

A fold applies a binary operation between every array element, in a left-associative or right-association fashion.
An initial element is put leftmost or rightmost.

```typescript
foldLeft(f, init, [x0, x1, x2, x3]) = f(f(f(f(init, x0), x1), x2), x3)
foldRight(f, init, [x0, x1, x2, x3]) = f(x0, f(x1, f(x2, f(x3, init))))
```

A scan returns an array of the intermediate values of the fold operation.

```typescript
scanLeft(f, init, [x0, x1, x2, x3]) = [f(init, x0), f(f(init, x0), x1), f(f(f(init, x0), x1), x2), f(f(f(f(init, x0), x1), x2), x3)]
```

The `scan` operation can be incrementalized by determining the correct index that requires re-computing when an array is affected
at a particular index.

The incrementalization of `fold` evaluates the `scan` as a residual, and returns the last element of the `scan`.

## Filter

`filter(pred)` is implemented by creating a cumulative sum array to determine the new index in the filtered array.

The predicate is a non-incremental function since there is no point to analyze the changes on booleans.

The cumulative sum array is comuted using the `scanLeft` operation, the residual of the function.

```typescript
filter : <T>(pred: (input: T) => boolean): IF<T[], [T[], number[]]>
```

## `flatMap`

```typescript
flatMap : <S, T>(func: IF<S, T[]>): IF<S[], [T[], [number[], T[][]]]>
```

## `concat`

```typescript
concat : <T>(): IF<T[][], [T[], number[]]>
```
