import * as Arr from "@/builder/array";
import { condSingle } from "@/builder/cond";
import type { AnyIF, IF } from "@/types";
import { identity } from "../builder";
import { type ITraversal, OpticsKind } from "./types";

export const all = <T>(): ITraversal<T[], T, [number]> => ({
	kind: OpticsKind.Traversal,
	getMulti: identity<T[]>(),
	over: Arr.map,
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
});
