# Recursive Type

A recursive type `T` contains `T` itself somewhere in its structure.
Care must be taken to prevent infinite recursion at runtime and
during type checking.

Example of recursive types:

 - Linked list: `list x = nil | cons(x, list x)`
   - Alternative: `list x = cons(x, optional(list x))`
 - Binary trees: `tree x = leaf | branch(x, tree x, tree x)`

When constructing a recursive type, we must define a getter to
reference to the type being defined.

```ts
// tree = { name: string, children?: list<tree>[] }
const tree = s.record({
	name: s.string(),
	get children() {
		return s.optional(s.list(tree));
	},
});
```

## The `RecBrand` helper type

When type derivation is involved, recursive types can lead to infinite
type instantiations. The helper type `RecBrand` exists to avoid infinite recursions.

Suppose we have a typeclass for deep equality `Eq` that's defined if and only if
all member types have `Eq`.

### Without `RecBrand`

- `AList<A>` implements `Eq`?
  - `nil` case implements `Eq`? - Yes
  - `cons` case implements `Eq`?
    - `head`: `A` implements `Eq`? - Yes/No
    - `tail`: `AList<A>` implements `Eq`?
      - ... infinite recursion


### With `RecBrand`

Suppose `RecBrand` is applied on `AList` itself, the typeclass check for sum and
product types will explicitly filter inner types with `RecBrand`.

```ts
interface AList<A> extends RecBrand, ... {}
```

Now the "`AList<A>` implements `Eq`?" check will only depend on `A`. 

The `OmitRecursive` helper type filters out `RecBrand` members from the shape.
Unary types such as `AOptional` have their own checks against `RecBrand` as well.

- `AList<A>` implements `Eq`?
  - `nil` case implements `Eq`? - Yes
  - `cons` case implements `Eq`?
    - `head`: `A` implements `Eq`? - Yes/No
    - `tail`: filtered out by `OmitRecursive`

## Derivation for `fast-check` generators

The automatically derived `fast-check` generators are not written in terms of `fc.letrec`.
`RecBrand` cannot be detected at runtime. To avoid infinite recursion of generators, a 
`depth` counter is kept track of where some generators will return a trivial generator 
if `depth` is sufficiently low.
