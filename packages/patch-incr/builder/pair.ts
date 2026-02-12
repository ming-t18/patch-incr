import type { IF, IFInv } from "../types";
import { identity } from ".";
import { composeReeval } from "./compose";
import { access, tupleFor } from "./struct";

export type Pair<A, B> = [A, B];

export const fst = <A, B>(): IF<[A, B], A> => access<A, 0, [A, B]>(0);
export const snd = <A, B>(): IF<[A, B], B> => access<B, 1, [A, B]>(1);

/** Similar to Arrow or Bifunctor `(&&&)` */
export const pair = <I, A, B>(f1: IF<I, A>, f2: IF<I, B>): IF<I, [A, B]> =>
	tupleFor<I>()(f1, f2);

const _dup = {
	...pair(identity<any>(), identity<any>()),
	inverseEvaluate: ([a, _]: [any, any]): any => a,
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
