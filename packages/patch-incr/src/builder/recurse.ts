import type { AnyIF } from "../types";

/**
 * Helper to create a recursive incremental function similar to the Y combinator.
 * @param getFunc The callback to construct the recursive funtion.
 * The first argument of the callback is the recursive function itself
 * in the uninitialized state (empty object).
 */
export const recurse = <F extends AnyIF>(getFunc: (rec: F) => F): F => {
	const rec: F = {} as never;
	const { evaluate, forward } = getFunc(rec);
	rec.evaluate = evaluate;
	rec.forward = forward;
	return rec;
};
