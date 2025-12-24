import type { AnyIF } from "../types";

export const recurse = <F extends AnyIF>(func: (func: F) => F): F => {
	const rec: F = {} as never;
	const { evaluate, forward } = func(rec);
	rec.evaluate = evaluate;
	rec.forward = forward;
	return rec;
};
