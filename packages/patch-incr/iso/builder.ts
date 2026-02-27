import * as B from "@/builder";
import { composeMemo } from "@/builder/compose";
import type { Patches } from "@/patch";
import type { IF } from "@/types";
import type { IIso } from "./types";

export const hole = <A, B, DA = Patches<A>, DB = Patches<B>>(): IIso<
	A,
	B,
	DA,
	DB
> => {
	throw new Error("IIso: hole");
};

/** Creates an incremental isomorphism from two incremental functions. */
export const fromPair = <A, B, DA = Patches<A>, DB = Patches<B>>(
	fw: IF<A, B, DA, DB>,
	bw: IF<B, A, DB, DA>,
): IIso<A, B, DA, DB> => ({ fw, bw });

/** The identity incremental isomorphism. */
export const identity = <T, DT = Patches<T>>(): IIso<T, T, DT, DT> =>
	fromPair(B.identity<T, DT>(), B.identity<T, DT>());

/** Composes two incremental isomorphisms. */
export const compose = <
	A extends WeakKey,
	B extends WeakKey,
	C extends WeakKey,
	DA = Patches<A>,
	DB = Patches<B>,
	DC = Patches<C>,
>(
	f1: IIso<A, B, DA, DB>,
	f2: IIso<B, C, DB, DC>,
): IIso<A, C, DA, DC> =>
	fromPair(composeMemo(f1.fw, f2.fw), composeMemo(f2.bw, f1.bw));

export const sym = <A, B, DA = Patches<A>, DB = Patches<B>>({
	fw,
	bw,
}: IIso<A, B, DA, DB>): IIso<B, A, DB, DA> => fromPair(bw, fw);
