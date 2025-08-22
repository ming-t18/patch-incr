/**
 * # Incremental function composition
 *
 * Function composition is applying two functions, `f` and `g`, in sequence.
 * ```
 * y = g(f(x))
 * dy = g'(f(x); f'(x; dx))
 * ```
 * In incremental computations, the intermediate value `f(x)` must be part of the
 * output in order to recover information for computing patches.
 *
 * ```typescript
 * compose : (f1: IF<X, V>, f2: IF<V, Y>) => IF<X, [Y, V]>
 * ```
 *
 * ```typescript
 * // x: X, f : IF<X, V>, g : IF<V, Y>
 * // compose(f, g): IF<X, [Y, V]>
 * [y, v] = compose(f, g).evaluate(x)
 * // v is the value of g(x)
 * ```
 *
 * There are extra helpers to avoid returning the intermedate value
 * as part of the result.
 *
 * ```typescript
 * composeMemoLeft : (f1: IF<X, V>, f2: IF<V, Y>) => IF<X, Y>
 *   where X extends WeakKey
 * composeMemo : (f1: IF<X, V>, f2: IF<V, Y>) => IF<X, Y>
 *   where Y extends WeakKey
 * composeWithInv : (f1: IF<X, V>, f2: IFInv<V, Y>) => IF<X, Y>
 * ```
 *
 * ## Memoizing the intermediate value with `WeakMap`
 * If the return value `Y` is a reference type, then a `WeakMap`
 * can be constructed to map from `Y` to `V`
 *
 * ## Recovering the intermediate value with the inverse function.
 * Some `IF`s have inverses that can be used to recover the intermediate
 *  value.
 */

export { compose } from "./compose";
export {
	composeMemoL as composeMemoLeft,
	composeMemoR as composeMemo,
	composer,
	MemoComposer,
	type Pipe,
} from "./memo";
export { composeWithInv as composeNoInterm } from "./noInterm";
