import { constant, identity as id } from "@/builder";
import * as Arr from "@/builder/array";
import { composeMemo } from "@/builder/compose";
import { composeMemoEndo } from "@/builder/compose/memo";
import * as Pair from "@/builder/pair";
import { tupleFor } from "@/builder/struct";
import type { IF } from "@/types";
import { toTraversal } from "./builder";
import {
	type GetFamilyType,
	type InferOpticsOut,
	type IOptics,
	type ITraversal,
	OpticsKind,
} from "./types";

export const empty = <T, A, F = []>(): ITraversal<T, A, F> => ({
	kind: OpticsKind.Traversal,
	getMulti: constant<A[], T>([]),
	over: (_f) => id(),
	overCtx: (_f) => Pair.fst(),
	set: Pair.fst(),
});

const plusMany = <T extends WeakKey, A>(...fs: IF<T, A[]>[]): IF<T, A[]> =>
	composeMemo(tupleFor<T>()(...fs), Arr.concatSingle());

export const plus =
	<T extends WeakKey>() =>
	<
		// biome-ignore lint/suspicious/noExplicitAny: for constraint
		Args extends IOptics<T, A, any>[],
		A = InferOpticsOut<Args[number]>,
	>(
		...os: Args
	): ITraversal<T, A, [GetFamilyType<Args[number]>]> => {
		if (os.length === 0) {
			return empty();
		} else if (os.length === 1) {
			return toTraversal(os[0]);
		}
		const ts = os.map((o) => toTraversal(o));
		return {
			kind: OpticsKind.Traversal,
			getMulti: plusMany(...ts.map((x) => x.getMulti)),
			set: composeMemo(
				composeMemoEndo<[T, A]>(ts.map((t) => Pair.pair(t.set, Pair.snd()))),
				Pair.fst(),
			),
			over: (f: IF<A, A>): IF<T, T> =>
				composeMemoEndo<T>(ts.map((t) => t.over(f))),
			overCtx: <Ctx>(f: IF<[A, Ctx], A>): IF<[T, Ctx], T> =>
				composeMemo(
					composeMemoEndo<[T, Ctx]>(
						ts.map((t) => Pair.pair(t.overCtx(f), Pair.snd())),
					),
					Pair.fst(),
				),
		};
	};

export { traversalComposeIso as composeIso } from "./iso";
