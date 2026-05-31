import type { Apply, ReplaceOnly } from "./types/algebra";

/**
 * Creates an instance of `Apply` of a value-type with only one member
 * and a change-type with only one member being empty.
 * @param T The singleton value-type
 * @param D The singleton change-type representing the empty change of `T`
 */
export const constant = <T, D = never>(value: T, change: D): Apply<T, D> => {
	return {
		// @ts-expect-error For debugging
		$type: "constant",
		apply: (_v: T, _d: D): T => value,
		fromReplace: (_: T): D => change,
		isReplace: (_: D): ReplaceOnly<T> | null => null,
		empty: change,
		combine: (_a: D, _b: D): D => change,
		isEmpty: (_: D): boolean => true,
	};
};

export const nullType = constant(null, null);
