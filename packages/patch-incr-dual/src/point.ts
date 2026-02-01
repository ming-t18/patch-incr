import { applyPatches } from "patch-incr/patch";
import { create, createReplace, GetD, GetV } from "./dv";
import type { BiDF, DF, DV } from "./types";

export { createReplace as create } from "./dv";

export const map =
	<Input, Output>(func: (value: Input) => Output): DF<Input, Output> =>
	({ [GetV]: v, [GetD]: dv }: DV<Input>): DV<Output> =>
		dv ? createReplace(func(v), func(applyPatches(v, dv))) : create(func(v));

export const bimap =
	<A, B, Output>(func: (a: A, b: B) => Output): BiDF<A, B, Output> =>
	(
		{ [GetV]: a, [GetD]: da }: DV<A>,
		{ [GetV]: b, [GetD]: db }: DV<B>,
	): DV<Output> => {
		if (!da && !db) {
			return create(func(a, b));
		}

		return createReplace(
			func(a, b),
			func(applyPatches(a, da ?? []), applyPatches(b, db ?? [])),
		);
	};
