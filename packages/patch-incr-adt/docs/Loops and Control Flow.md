# Loops and Control Flow

A more complex program contains control flows such as loops and conditionals.
If we can incrementalize them, we can incrementalize almost all programs.

## Representation of control flow

Most imperative programs can be represented using control flow graphs, with each node
containing no control flow.

In functional programming style, control flow involving loops can be realized using tail recursion.

## Incrementalizing control flow graphs

The `forward` implementation must ensure the same sequence of control flow graph nodes
are visited (through residual if needed), and involking each node's `forward` to propagate
the incremental changes.

The problem is if the sequence of control flow nodes is different from before, 
the entire program must be re-evaluated unless there are specific methods to reconcile
the differences.

For incremental computation in general, loops and recursion are bad abstractions. Instead,
we should focus on what and how the data is being processed and develop an efficient
incrementalization.

Example: A sum-over-list is a for loop or a fold function. Data types such as arrays and
linked lists will have their own helpers to incrementalize the sum operation efficiently.

```ts
sum = (xs) => {
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s;
}

// "reduce" in general can'be incrementalized efficiently without the "scan",
// but if commutative property can be applied, reduce can be incrementalized
sum_fold = (xs) => xs.reduce((s, a) => s + a, 0)
```

## Example

The following program has a control flow graph of A, B, C, D, E, F.

```ts
a = f(...) // A
if (cond1) {
  x = g(...) // B
} else {
  x = h(...) // C
}
y = x // D
z = y

while (cond2) {
  z = p(...) // E
}

return z; // F
```

Rewritten using mutual recursion:

```ts
A = (...) => {
  a = f(...);
  return cond1 ? B(...) : C(...);
}
B = (...) => { 
  x = g(...); 
  return D(...) 
};
C = (...) => { 
  x = h(...); 
  return D(...) 
};
D = (...) => {
  y = x;
  z = y;
  return E(...);
};

E = (...) => {
  if (cond2) { 
    ...; 
    return E(...) 
  } else {
    return F(...)
  }
};

F = () => { 
  ...; 
  return z; 
};
```

## Basic incrementalization

To incrementalize a program containing loops and control flow, the residual of the
incremental function must containing information retracing the codepath of the
evaluation. 

In the `forward` implementation, the incrementalized retraces each node visited and
