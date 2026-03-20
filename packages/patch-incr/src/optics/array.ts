import * as Arr from "@/builder/array";
import { condSingle } from "@/builder/cond";
import { identity } from "../builder";
import { type ITraversal, OpticsKind } from "./types";

export const all = <T>(): ITraversal<T[], T> => ({
	kind: OpticsKind.Traversal,
	getMulti: identity<T[]>(),
	set: Arr.map,
});

export const filter = <T>(pred: (input: T) => boolean): ITraversal<T[], T> => ({
	kind: OpticsKind.Traversal,
	getMulti: Arr.filterSingle(pred),
	set: (f) => Arr.map(condSingle(pred, f, identity())),
});
