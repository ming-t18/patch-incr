# Equality and Equivalence Classes

In general, we use deep equal to determine if two non-atomic values are equal. However, there are exceptions to this rule on some incremental functions.

## Equivalence class

An equivalence class is defined by defining special rules of equivalence. Examples include:

- Deep equality of objects disregard reference inequality
- Rational numbers are compared disregarding common factors (`1/2 = 5/10`)
- For JSON objects, the order of the keys are disregarded
- In incremental parsing (such as tree-sitter), all error states are considered equivalent (parse errors depend on the intermediate steps)

## Order invariance

The order of the elements do not matter for:
 - Struct (keys)
 - Mapping (keys)
 - Set

The order of the elements matter for arrays in general. However, some incremental functions take or return
arrays disregarding order.

For example, incremental versions of `Object.keys` and `Object.entries` return an array disregarding the order due to the order invariance of objects. This rule allows newly added keys to be placed to the end of the output array instead of calculating an index in original JavaScript order.
