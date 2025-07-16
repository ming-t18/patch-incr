import type { IF } from "../types";
import { type ApplyCombine, type DRO, ReplaceOnly } from ".";

export type { ApplyCombine, DRO, ReplaceOnly } from ".";

/**
 * Incremental function that accepts only replace-only or no-change on both sides
 * of the change type.
 */
export type IFRO<X, Y> = IF<X, Y, DRO<X>, DRO<Y>>;

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

const _applyReplaceOnly = <T>(): ApplyCombine<T, DRO<T>> => ({
	apply: (x, r): T => (r ? r[ReplaceOnly] : x),
	fromReplace: (r) => ({ [ReplaceOnly]: r }),
	empty: null,
	isEmpty: (x) => !x,
	isReplace: (x) => x,
	combine: (a, b) => (b ? b : a),
});

const _INSTANCE = Object.freeze(_applyReplaceOnly<unknown>());
export const applyReplaceOnly = <T>() => _INSTANCE as ApplyCombine<T, DRO<T>>;
