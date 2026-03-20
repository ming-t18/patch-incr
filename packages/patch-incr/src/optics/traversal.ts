import { constant, identity as id } from "@/builder";
import * as Arr from "@/builder/array";
import { composeMemo } from "@/builder/compose";
import { tupleFor } from "@/builder/struct";
import type { IF } from "@/types";
import { toTraversal } from "./builder";
import { type IOptics, type ITraversal, OpticsKind } from "./types";

export const empty = <T, A>(): ITraversal<T, A> => ({
	kind: OpticsKind.Traversal,
	getMulti: constant<A[], T>([]),
	set: (_f) => id(),
});

export { filter as where } from "./array";

const plusMany = <T extends WeakKey, A>(...fs: IF<T, A[]>[]): IF<T, A[]> =>
	composeMemo(tupleFor<T>()(...fs), Arr.concatSingle());

export const plus = <T extends WeakKey, A>(
	...os: IOptics<T, A>[]
): ITraversal<T, A> => {
	const ts = os.map((o) => toTraversal(o));
	return {
		kind: OpticsKind.Traversal,
		getMulti: plusMany(...ts.map((x) => x.getMulti)),
		// @ts-expect-error Spread of same types
		set: (f) => composeMemo(...ts.map((t) => t.set(f))),
	};
};
