import type { IF, IFInv } from "../types";
import { identity } from ".";
import { composeIFInv3, composeReeval } from "./compose";
import { access, tupleFor } from "./struct";
import * as Tuple from "./tuple";

export type Pair<A, B> = [A, B];

export const fst = <A, B>(): IF<[A, B], A> => access<A, 0, [A, B]>(0);
export const snd = <A, B>(): IF<[A, B], B> => access<B, 1, [A, B]>(1);

/** Similar to Arrow or Bifunctor `(&&&)` */
export const pair = <I, A, B>(f1: IF<I, A>, f2: IF<I, B>): IF<I, [A, B]> =>
	tupleFor<I>()(f1, f2);

const _dup = {
	...pair(identity<unknown>(), identity<unknown>()),
	inverseEvaluate: ([a, _]: [unknown, unknown]): unknown => a,
};

/** Similar to Arrow or Bifunctor `split` */
export const dup = <A>(): IFInv<A, [A, A]> => _dup as never;

/** Similar to Arrow or Bifunctor `(***)` */
export const firstSecond = <A, B, A1, B1>(
	f1: IF<A, A1>,
	f2: IF<B, B1>,
): IF<[A, B], [A1, B1]> =>
	pair(composeReeval(fst(), f1), composeReeval(snd(), f2));

/** Similar to Arrow or Bifunctor `first` */
export const first = <A, B, A1>(f1: IF<A, A1>): IF<[A, B], [A1, B]> =>
	pair(composeReeval(fst(), f1), snd());

/** Similar to Arrow or Bifunctor `second` */
export const second = <A, B, B1>(f2: IF<B, B1>): IF<[A, B], [A, B1]> =>
	pair(fst(), composeReeval(snd(), f2));

export const firstInv = <A, B, A1>(f1: IFInv<A, A1>): IFInv<[A, B], [A1, B]> =>
	({
		...first(f1),
		inverseEvaluate: ([a1, b]: [A1, B]): [A, B] => [f1.inverseEvaluate(a1), b],
	}) as never;

export const secondInv = <A, B, B1>(f2: IFInv<B, B1>): IFInv<[A, B], [A, B1]> =>
	({
		...second(f2),
		inverseEvaluate: ([a, b1]: [A, B1]): [A, B] => [a, f2.inverseEvaluate(b1)],
	}) as never;

export { assocLeft, assocRight, comm as swap } from "./tuple";

/** Permutation helper for managing residuals. */
export const abc_acb = <A, B, C>(): IFInv<[[A, B], C], [[A, C], B]> =>
	composeIFInv3(Tuple.assocRight(), secondInv(Tuple.comm()), Tuple.assocLeft());

export const abc_bac = <A, B, C>(): IFInv<[A, [B, C]], [B, [A, C]]> =>
	composeIFInv3(Tuple.assocLeft(), firstInv(Tuple.comm()), Tuple.assocRight());

/** Permutation helper for managing residuals. */
export const abcd_acdb = <A, B, C, D>(): IFInv<
	[[A, B], [C, D]],
	[[A, C], [D, B]]
> =>
	composeIFInv3(
		abc_acb<A, B, [C, D]>(),
		firstInv(Tuple.assocLeft()),
		Tuple.assocRight(),
	);

export const acdb_abcd = <A, B, C, D>(): IFInv<
	[[A, C], [D, B]],
	[[A, B], [C, D]]
> =>
	composeIFInv3(
		Tuple.assocLeft(),
		firstInv(Tuple.assocRight()),
		abc_acb<A, [C, D], B>(),
	);
