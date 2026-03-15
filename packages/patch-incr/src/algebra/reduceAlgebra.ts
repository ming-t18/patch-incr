/**
 * A `ReduceAlgebra<Acc, T>` represents an abelian group
 * (commutative and associative) that aggregates
 * an unordered collection containing multiple `T`s
 * into an accumulator type `Acc`.
 *
 * The interface methods are named after list patches: replace/add/remove.
 *
 * Notation:
 *  - `reduce(alg)([a, b, c]) = alg.init <> f(a) <> f(b) <> f(c)`
 *  - Remove contribution: `reduce(alg)([a, b]) = reduce(alg)([a, b, c]) <> inverse(f(c))`
 *  - `f : T -> Acc` determines the contribution of an individual element.
 *  - `inverse : Acc -> Acc` inverts a contribution.
 *
 * If `Acc` is a structure with patches, use `IncReduceAlgebra`
 * for an algebra on the incremental contributions to `Acc`.
 *
 * @see IncReduceAlgebra
 */
export interface ReduceAlgebra<Acc, T> {
	/**
	 * Initial value of the accumulator (or the aggregation of the empty list: `reduce(alg)([]) = init`).
	 * Does not have to be the identity element of the group.
	 * */
	init: Acc;
	/** `acc <> f(value)` */
	add: (acc: Acc, value: T) => Acc;
	/** `acc <> inverse(f(value))` */
	remove: (acc: Acc, value: T) => Acc;
	/** `acc <> inverse(f(prev)) <> f(next)` */
	replace: (acc: Acc, prev: T, next: T) => Acc;
}

export const sumWith = <T, N extends number | bigint = number>(
	f: (value: T) => N,
	init = 0 as N,
): ReduceAlgebra<N, T> => ({
	init,
	// @ts-expect-error N -> number
	replace: (acc, prev, next) => acc + (f(next) - f(prev)),
	// @ts-expect-error N -> number
	add: (acc, value) => acc + f(value),
	// @ts-expect-error N -> number
	remove: (acc, value) => acc - f(value),
});

export const sumNumber = (init = 0): ReduceAlgebra<number, number> => ({
	init,
	replace: (acc, prev, next) => acc + (next - prev),
	add: (acc, value) => acc + value,
	remove: (acc, value) => acc - value,
});

export const sumBigint = (init = 0n): ReduceAlgebra<bigint, bigint> => ({
	init,
	replace: (acc, prev, next) => acc + (next - prev),
	add: (acc, value) => acc + value,
	remove: (acc, value) => acc - value,
});
