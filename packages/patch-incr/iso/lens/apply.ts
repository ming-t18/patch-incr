import { composeMemo } from "@/builder/compose";
import * as P from "@/builder/pair";
import type { IF } from "@/types";
import { compose } from "../builder";
import * as Pair from "../pair";
import type { IIsoLens } from "./types";

/** Composes two isomorphism lenses. */
export const composeLens = <A extends WeakKey, B, C, R, R1>(
	f1: IIsoLens<A, B, R>,
	f2: IIsoLens<B, C, R1>,
): IIsoLens<A, C, [R1, R]> =>
	compose(f1, compose(Pair.first(f2), Pair.assocRight()));

export const get = <A extends WeakKey, B, R>(f: IIsoLens<A, B, R>): IF<A, B> =>
	composeMemo(f.fw, P.fst());

export const set = <A extends WeakKey, B, R>(
	f: IIsoLens<A, B, R>,
	g: IF<B, B>,
): IF<A, A> => composeMemo(f.fw, P.first(g), f.bw);

export const set1 = <A extends WeakKey, A1 extends WeakKey, B, B1, R>(
	ff: IIsoLens<A, B, R>,
	fb: IIsoLens<A1, B1, R>,
	g: IF<B, B1>,
): IF<A, A1> => composeMemo(ff.fw, P.first(g), fb.bw);
