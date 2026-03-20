import { castOutput, constant, identity as id } from "@/builder";
import { composeMemo } from "@/builder/compose";
import * as Option from "@/builder/option";
import type { IIso } from "@/iso/types";
import type { IF } from "@/types";
import { type IPrism, OpticsKind } from "./types";

export const empty = <T, A>(): IPrism<T, A> => ({
	kind: OpticsKind.Prism,
	getOpt: constant<Option.Option<A>, T>(Option.Nothing),
	set: (_f) => id(),
});

export const where = <T, TSub extends T = T>(
	pred: (value: T) => boolean,
): IPrism<T, TSub> => ({
	kind: OpticsKind.Prism,
	getOpt: castOutput(Option.fromPred<T, TSub>(pred)),
	set: (_f) => castOutput(id()),
});

export const composeIso = <T extends WeakKey, A extends WeakKey, B>(
	o: IPrism<T, A>,
	{ fw, bw }: IIso<A, B>,
): IPrism<T, B> => {
	const set = (f: IF<B, B>): IF<T, T> => o.set(composeMemo(fw, f, bw));
	return {
		kind: OpticsKind.Prism,
		getOpt: composeMemo(o.getOpt, Option.map(fw)),
		set,
	};
};
