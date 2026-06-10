# patch-incr-adt

Algebraic data types for patch-based incremental computation.

```ts
import * as s from "patch-incr-adt"
const todoItem = s.record({
  done: s.boolean(),
  text: s.string(),
});

type TodoItem = s.infer<typeof todoItem>
type DTodoItem = s.inferChange<typeof todoItem>
```
