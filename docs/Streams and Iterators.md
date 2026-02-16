# Streams and Iterators

A stream or iterator basically builds an array in an append-only fashion.

Existing `IF` on arrays can aleady be used to process streams.

Suppose we have an `IF<A[], B>` and we have a `Generator<A>`.

When additional elements `x : A` is emitted from the generator, 
we can call `IF.forward` with the append to the end patch to feed the 
new element.

Using array `IF`s are inefficient for streaming due to most of them
maintaining cumulative sum structures.

It might be possible to introduce a new shape "stream" for append-only arrays.

The streaming versions of `filter` and `flatMap` would no longer need to
maintain cumulative sums.
