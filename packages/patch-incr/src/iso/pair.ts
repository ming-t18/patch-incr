import * as Pair from "@/builder/pair";
import { fromPair } from "./builder";
import type { IIso } from "./types";

export const swap = <A, B>(): IIso<[A, B], [B, A]> =>
	fromPair(Pair.swap(), Pair.swap());

export const first = <A, B, A1>(f: IIso<A, A1>): IIso<[A, B], [A1, B]> =>
	fromPair(Pair.first(f.fw), Pair.first(f.bw));

export const second = <A, B, B1>(f: IIso<B, B1>): IIso<[A, B], [A, B1]> =>
	fromPair(Pair.second(f.fw), Pair.second(f.bw));

export const firstSecond = <A, B, A1, B1>(
	f: IIso<A, A1>,
	g: IIso<B, B1>,
): IIso<[A, B], [A1, B1]> =>
	fromPair(Pair.firstSecond(f.fw, g.fw), Pair.firstSecond(f.bw, g.bw));

export const assocLeft = <A, B, C>(): IIso<[A, [B, C]], [[A, B], C]> =>
	fromPair(Pair.assocLeft(), Pair.assocRight());

export const assocRight = <A, B, C>(): IIso<[[A, B], C], [A, [B, C]]> =>
	fromPair(Pair.assocRight(), Pair.assocLeft());

export const abc_acb = <A, B, C>(): IIso<[[A, B], C], [[A, C], B]> =>
	fromPair(Pair.abc_acb(), Pair.abc_acb());

export const abc_bac = <A, B, C>(): IIso<[A, [B, C]], [B, [A, C]]> =>
	fromPair(Pair.abc_bac(), Pair.abc_bac());

export const abcd_abdc = <A, B, C, D>(): IIso<
	[[A, B], [C, D]],
	[[A, C], [D, B]]
> => fromPair(Pair.abcd_acdb(), Pair.acdb_abcd());
