import type { RecBrand } from "@/props";
import type { AnyApply, Apply } from "@/types/algebra";

export const recApply = <T, DT, A extends Apply<T, DT>>(
	func: (recursed: A) => A,
): Apply<T, DT> => {
	const recursed: A = {} as never;
	const res: A = func(recursed);
	for (const [key, value] of Object.entries(res)) {
		// @ts-expect-error Can't be checked
		recursed[key] = value;
	}

	// @ts-expect-error For debugging
	recursed.$isRecursive = true;
	return recursed;
};

/** Add a brand for a type being recursive. */
export const recBrand = <A extends AnyApply>(x: A): A & RecBrand => x;
