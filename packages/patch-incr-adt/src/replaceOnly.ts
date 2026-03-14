import { type DRO, ReplaceOnly } from "patch-incr/algebra";
import type { ARO } from "./types";

export const replaceOnly = <T>(): ARO<T> => ({
	combine: (left: DRO<T>, right: DRO<T>): DRO<T> =>
		right === null ? left : right,
	apply: (value: T, change: DRO<T>): T =>
		change === null ? value : change[ReplaceOnly],
	empty: null,
	fromReplace: (value: T): DRO<T> => ({ [ReplaceOnly]: value }),
	isEmpty: (change: DRO<T>): boolean => change === null,
	isReplace: (change: DRO<T>): ReplaceOnly<T> | null => change,
});
