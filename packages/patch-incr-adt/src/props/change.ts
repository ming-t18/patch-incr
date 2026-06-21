import { getReplaceOnly } from "@/replaceOnly";
import { type Apply, ApplyError, type Monoid, type ReplaceOnly } from "@/types";

export interface PropsMonoid<M> {
	/** isEmpty(empty) */
	emptyIsEmpty: () => boolean;
	/** empty <> d = d */
	leftIdentity: (a: M) => boolean;
	/** d <> empty = d */
	rightIdentity: (a: M) => boolean;
	/** a <> (b <> c) = (a <> b) <> c */
	assoc: (a: M, b: M, c: M) => boolean;
}

export interface PropsApply<T, D> extends PropsMonoid<D> {
	emptyNoChange: (val: T) => boolean;
	isEmptyImpliesNoChange: (val: T, change: D) => boolean;
	/** (v @ d1) @ d2 = v @ (d1 <> d2) */
	applyCombine: (val: T, change1: D, change2: D) => boolean;
	replaceIsNotEmpty: (rep: T) => boolean;
	/** R(a) <> R(b) = R(b) */
	replaceOverridesFirstReplace: (rep1: T, rep2: T) => boolean;
	/** d <> R(b) = R(b) */
	combineWithReplaceIsReplace: (d1: D, rep: T) => boolean;
	/** a <> R(b) = b */
	applyReplaceReplaces: (val: T, rep: T) => boolean;
	canApplyEmptyAlwaysTrue: (val: T) => boolean;
	canApplyReplaceAlwaysTrue: (val: T, rep: T) => boolean;
	canApplyIffApplyNoError: (val: T, change: D) => boolean;
	/** getReplaceOnly(empty) = null */
	isReplaceOnlyIsNullOnEmpty: () => boolean;
	/** getReplaceOnly(R(a)) = a */
	isReplaceOnlyOnReplace: (rep: T) => boolean;
}

export type Eq<T> = (a: T, b: T) => boolean;

export const makePropsMonoid = <M>(
	m: Monoid<M>,
	eq = Object.is as Eq<M>,
): PropsMonoid<M> => ({
	emptyIsEmpty: () => m.isEmpty(m.empty),
	leftIdentity: (a: M) => eq(m.combine(m.empty, a), a),
	rightIdentity: (a: M) => eq(m.combine(a, m.empty), a),
	assoc: (a: M, b: M, c: M): boolean => {
		try {
			const bc = m.combine(b, c);
			const ab = m.combine(a, b);
			return eq(m.combine(a, bc), m.combine(ab, c));
		} catch (e) {
			if (e instanceof ApplyError) {
				return true;
			}
			throw e;
		}
	},
});

export const makePropsApply = <T, D>(
	apply: Apply<T, D>,
	eqValue = Object.is as Eq<T>,
	eqApply = Object.is as Eq<D>,
): PropsApply<T, D> => ({
	...makePropsMonoid(apply, eqApply),
	emptyNoChange: (v: T) => eqValue(v, apply.apply(v, apply.empty)),
	isEmptyImpliesNoChange: (v: T, d: D) =>
		apply.isEmpty(d) && apply.canApply(v, d)
			? eqValue(v, apply.apply(v, d))
			: true,
	applyCombine: (v: T, d1: D, d2: D) => {
		try {
			return apply.canCombine(d1, d2) && apply.canApply(v, d1)
				? eqValue(
						apply.apply(apply.apply(v, d1), d2),
						apply.apply(v, apply.combine(d1, d2)),
					)
				: true;
		} catch (e) {
			if (e instanceof ApplyError) {
				return true;
			}
			throw e;
		}
	},
	replaceIsNotEmpty: (r: T) => !apply.isEmpty(apply.fromReplace(r)),
	replaceOverridesFirstReplace: (rep1: T, rep2: T) =>
		eqApply(
			apply.combine(apply.fromReplace(rep1), apply.fromReplace(rep2)),
			apply.fromReplace(rep2),
		),
	combineWithReplaceIsReplace: (d1: D, rep: T) =>
		eqApply(apply.combine(d1, apply.fromReplace(rep)), apply.fromReplace(rep)),
	applyReplaceReplaces: (val: T, rep: T) =>
		eqValue(apply.apply(val, apply.fromReplace(rep)), rep),
	canApplyEmptyAlwaysTrue: (val: T) => apply.canApply(val, apply.empty),
	canApplyReplaceAlwaysTrue: (val: T, rep: T) =>
		apply.canApply(val, apply.fromReplace(rep)),
	canApplyIffApplyNoError: (value: T, change: D) => {
		if (apply.canApply(value, change)) {
			apply.apply(value, change);
			return true;
		} else {
			try {
				apply.apply(value, change);
				return false;
			} catch {
				return true;
			}
		}
	},
	isReplaceOnlyIsNullOnEmpty: () => apply.isReplace(apply.empty) === null,
	isReplaceOnlyOnReplace: (rep: T) => {
		const rep1 = apply.isReplace(
			apply.fromReplace(rep),
		) as ReplaceOnly<T> | null;
		return rep1 === null || Object.is(rep, getReplaceOnly(rep1));
	},
});
