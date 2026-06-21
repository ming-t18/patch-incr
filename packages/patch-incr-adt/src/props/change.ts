import type { Apply, Monoid } from "@/types";

export interface PropsMonoid<M> {
	/** isEmpty(d) = (d == i) */
	isEmptyEqEmpty: (a: M) => boolean;
	/** i <> d = d */
	leftIdentity: (a: M) => boolean;
	/** d <> i = d */
	rightIdentity: (a: M) => boolean;
	/** a <> (b <> c) = (a <> b) <> c */
	assoc: (a: M, b: M, c: M) => boolean;
}

export interface PropsApply<T, D> extends PropsMonoid<D> {
	/** R(a) <> R(b) = R(b) */
	replaceOverridesFirstReplace: (rep1: T, rep2: T) => boolean;
	/** d <> R(b) = R(b) */
	combineWithReplaceIsReplace: (d1: D, rep: T) => boolean;
	/** a <> R(b) = b */
	applyReplaceReplaces: (val: T, rep: T) => boolean;
}

export type Eq<T> = (a: T, b: T) => boolean;

export const makePropsMonoid = <M>(
	m: Monoid<M>,
	eq = Object.is as Eq<M>,
): PropsMonoid<M> => ({
	isEmptyEqEmpty: (a: M) => m.isEmpty(a) === eq(a, m.empty),
	leftIdentity: (a: M) => eq(m.combine(m.empty, a), a),
	rightIdentity: (a: M) => eq(m.combine(a, m.empty), a),
	assoc: (a: M, b: M, c: M): boolean =>
		eq(m.combine(a, m.combine(b, c)), m.combine(m.combine(a, b), c)),
});

export const makePropsApply = <T, D>(
	apply: Apply<T, D>,
	eqValue = Object.is as Eq<T>,
	eqApply = Object.is as Eq<D>,
) => ({
	...makePropsMonoid(apply, eqApply),
	replaceOverridesFirstReplace: (rep1: T, rep2: T) =>
		eqApply(
			apply.combine(apply.fromReplace(rep1), apply.fromReplace(rep2)),
			apply.fromReplace(rep2),
		),
	combineWithReplaceIsReplace: (d1: D, rep: T) =>
		eqApply(apply.combine(d1, apply.fromReplace(rep)), apply.fromReplace(rep)),
	applyReplaceReplaces: (val: T, rep: T) =>
		eqValue(apply.apply(val, apply.fromReplace(rep)), rep),
});
