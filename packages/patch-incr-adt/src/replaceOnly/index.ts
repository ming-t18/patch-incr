import type { Apply } from "@/types";
import { type DRO, ReplaceOnly } from "@/types/replaceOnly";

export const makeReplaceOnly = <T>(value: T): ReplaceOnly<T> => ({
	[ReplaceOnly]: value,
});

export const isReplaceOnly = <T>(value: unknown): value is ReplaceOnly<T> => {
	return !!value && typeof value === "object" && ReplaceOnly in value;
};

export const getReplaceOnly = <T>(value: ReplaceOnly<T>) => value[ReplaceOnly];

export const getDRO = <T>(value: DRO<T> | unknown): DRO<T> =>
	value === null || isReplaceOnly(value) ? (value as DRO<T>) : null;

export type ExcludeDRO<S, T> = Exclude<S, DRO<T>>;

export const maybeCombineDRO = <T, C>(
	a: C,
	b: C,
	applyCase: (a: T, b: C) => C,
	rest: (a1: ExcludeDRO<C, T>, b1: ExcludeDRO<C, T>) => C,
): C => {
	if (a === null) {
		return b;
	}
	if (b === null) {
		return a;
	}
	if (isReplaceOnly<T>(a)) {
		return applyCase(getReplaceOnly(a), b);
	}
	if (isReplaceOnly<T>(b)) {
		return b;
	}
	return rest(a as never, b as never);
};
export type * from "@/types/replaceOnly";

export class AReplaceOnly<T> implements Apply<T, DRO<T>> {
	readonly empty: DRO<T> = null;

	combine = (left: DRO<T>, right: DRO<T>): DRO<T> =>
		right === null ? left : right;
	apply = (value: T, change: DRO<T>): T =>
		change === null ? value : change[ReplaceOnly];
	fromReplace = (value: T): DRO<T> => ({ [ReplaceOnly]: value });
	isEmpty = (change: DRO<T>): boolean => change === null;
	isReplace = (change: DRO<T>): ReplaceOnly<T> | null => change;
}

const _INSTANCE = new AReplaceOnly<never>();
export const replaceOnly = <T>(): AReplaceOnly<T> => _INSTANCE as never;
