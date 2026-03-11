/** Algebra for a list reduce operation with
 * an initial accumulator and handlers for list replace/add/remove operations.
 *
 * The operation must be commutative and associative.
 */
export interface ReduceAlgebra<Acc, T> {
	init: Acc;
	replace: (acc: Acc, prev: T, next: T) => Acc;
	add: (acc: Acc, value: T) => Acc;
	remove: (acc: Acc, value: T) => Acc;
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
