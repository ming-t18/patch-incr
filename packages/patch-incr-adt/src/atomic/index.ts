import { getReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type { Apply, DRO, ReplaceOnly } from "@/types/algebra";

export const atomic = <T>(): Apply<T> => ({
	// @ts-expect-error For debugging
	$type: "atomic",
	empty: null,
	fromReplace: makeReplaceOnly,
	apply: (value: T, change: DRO<T>): T =>
		change === null ? value : getReplaceOnly(change),
	isReplace: (change: DRO<T>): ReplaceOnly<T> | null => change,
	combine: (a: DRO<T>, b: DRO<T>): DRO<T> => (b === null ? a : b),
	isEmpty: (change: DRO<T>): boolean => change === null,
});

export const boolean = () => atomic<boolean>();
export const string = () => atomic<string>();
export const number = () => atomic<number>();
export const bigint = () => atomic<bigint>();
export const symbol = () => atomic<symbol>();
export const date = () => atomic<Date>();
