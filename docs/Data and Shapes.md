# Data and Shapes

In this patch-based incremental computation library, the data that can be handled incrementally by the `IF` must
satisfy certain rules, or else the functions will misbehave.

In general, all data, supported by the Immer library under 
`enableMapSet()` and `enablePatches()` are supported by patch-based incremental computation.

Unlike Immer, custom classes are not supported.

1. All `IF` are designed around static typing with **no** runtime type checking: The input and outputs must satisfy the static typing of TypeScript
2. Incremental changes are only supported for `Map`, `Set`, `Array` and plain objects. All other types such as functions are replace-only
3. Add and delete patches cannot be applied on tuple elements
4. For objects, symbol keys and number keys are not supported
5. For objects, a key-value pair having value of `undefined` is indistinguishable from not having the pair at all
6. For objects, the order of the keys do not matter

## Shapes

Shape is a way of describing the contracts placed on non-union types.

Shape violations are not checked at all.

- Atomic: A catch-all shape for data with no internal incremental changes. Includes primitives and functions.
- Struct: An object with a fixed set of keys. The remove patch sets a particular key-value pair to `undefined`.
- Tuple: Like a struct, except represented by a fixed-length array. Cannot perform add or remove patches on the tuple elements.
- Mapping: Plain objects of `Record<K, V>` or `Map<K, V>`. Order-invariant
- Array: An ordered list of elements. Add and remove patches can displace elements.
- Set: A set of elements of any type, distinct by reference. Order-invariant.

## Equality

In general, we use deep equal to determine if two non-atomic values are equal. There are exceptions however.

See [./Equality.md]
