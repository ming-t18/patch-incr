# patcher

Tracks the patches applied on an object through assignment statements and mutating methods.

Like Immer under `enablePatches()`, `enableMapSet()` and `enableArrayMethods()`, 
except with simpler implementation and fewer safety checks.

This library exists because it is tailored for patch-based incremental computation,
including its extensibility protocol for patchable objects. 

```typescript
import { original, current, produceWithPatches } from 'patcher';

const original = {
  a: 100,
  b: [{ x: 1 }, { x: 2 }],
  c: 'test'
}
const [updated, patches] = produceWithPatches(original, (draft) => {
	draft.a = 100;
	delete draft.c;
	draft.b.push({ x: 3 });
	console.log(current(draft.b).length); // => 3
	draft.b.splice(0, 2, { x: 0 });
});
```

## How it works

This library uses `Proxy` extensively. When accessing a nested object,
a "reference" by object path (`draft.a[1].b` -> `["a", 1, "b"]`) which can be used to generate JSON patches.

Array and map methods have special handlers to generate efficient patches, such as the array `splice` method.

## Differences from Immer

 - No auto-freezing at all
 - No support for `[immerable]` objects
 - Fewer safety and correctness checks
 - Inverse patches are not generated at all (affects the signatures of the relevant functions)
 - `enablePatches()`, `enableMapSet()` and `enableArrayMethods()` behaviors cannot be disabled
 - Array methods such as `map`, `forEach` provide the undrafted elements to the callback, instead of drafted references
 - Only `produceWithPatches` API is available, and currying is not supported
 
Not yet implemented:

 - Supports copy/move/swap patches similar to JSON Patches
 - A "blind" patch builder where the final object is not tracked
