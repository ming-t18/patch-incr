import * as Arr from "@/builder/array";
import { distr } from "@/builder/array/dist";
import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import * as Pair from "@/builder/pair";
import type { AnyIF, IF } from "@/types";
import { castOutput, identity } from "../builder";
import { type ITraversal, OpticsKind } from "./types";

export const all = <T>(): ITraversal<T[], T, [number]> => ({
	kind: OpticsKind.Traversal,
	getMulti: identity<T[]>(),
	over: Arr.map,
	set: composeMemo(distr(), Arr.map(Pair.fst())),
	overCtx: (f) => composeMemo(distr(), Arr.map(f)),
});

export const filter = <T, TSub extends T>(
	pred: (input: T) => boolean,
): ITraversal<
	T[],
	TSub,
	T extends TSub ? [number, { type: T }] : [number, { cast: TSub }]
> => ({
	kind: OpticsKind.Traversal,
	getMulti: Arr.filterSingle(pred) satisfies IF<T[], T[]> as AnyIF,
	over: (f) => Arr.map(condSingle(pred, f, identity())),
	set: composeMemo(
		distr(),
		Arr.map(
			condSingle(
				([x]) => pred(x),
				castOutput<[T, TSub], TSub, T>(Pair.snd()),
				Pair.fst<T, TSub>(),
			),
		),
	),
	overCtx: <C>(f: IF<[TSub, C], TSub>): IF<[T[], C], T[]> =>
		composeMemo(
			distr(),
			Arr.map(
				condSingle<[T, C], T, T, [TSub, C], [T, C]>(
					([x]) => pred(x),
					castOutput(f),
					Pair.fst<T, C>(),
				),
			),
		),
});
