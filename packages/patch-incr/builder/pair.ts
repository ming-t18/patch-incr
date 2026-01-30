import type { IF } from "../types";
import { composeMemoLeft } from "./compose";
import { access, tupleFor } from "./struct";

export type Pair<A, B> = [A, B];

export const fst = <A, B>(): IF<[A, B], A> => access<A, 0, [A, B]>(0);
export const snd = <A, B>(): IF<[A, B], B> => access<B, 1, [A, B]>(1);
export const pair = <I, A, B>(f1: IF<I, A>, f2: IF<I, B>): IF<I, [A, B]> =>
	tupleFor<I>()(f1, f2);

export const firstSecond = <A, B, A1, B1>(
	f1: IF<A, A1>,
	f2: IF<B, B1>,
): IF<[A, B], [A1, B1]> =>
	pair(composeMemoLeft(fst(), f1), composeMemoLeft(snd(), f2));

export const first = <A, B, A1>(f1: IF<A, A1>): IF<[A, B], [A1, B]> =>
	pair(composeMemoLeft(fst(), f1), snd());

export const second = <A, B, B1>(f2: IF<B, B1>): IF<[A, B], [A, B1]> =>
	pair(fst(), composeMemoLeft(snd(), f2));
