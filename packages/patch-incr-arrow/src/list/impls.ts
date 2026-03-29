import type { IF } from "patch-incr/types";
import type { IACompose } from "@/arrow";
import type { IAAddList, IATrans } from "@/arrowTransformer";
import type { $2, $3 } from "@/hkt";
import { compose, runList, single } from "./builder";
import {
	type ImplsArrowListInput,
	type ImplsArrowListOutput,
	type List,
	ListKind,
	type ListT$,
} from "./types";

export const implArrowCompose = <T>(
	args: ImplsArrowListInput<T>,
): IACompose<ListT$<T>> => {
	const compose1 = compose(args);
	const { fromIF, identity } = args.compose;
	return {
		identity: <A>(): $2<ListT$<T>, A, A> => single(identity<A>()),
		fromIF: <A, B>(fn: IF<A, B>): $2<ListT$<T>, A, B> => single(fromIF(fn)),
		compose: <A extends WeakKey, B, C>(
			f1: $2<ListT$<T>, A, B>,
			f2: $2<ListT$<T>, B, C>,
		): $2<ListT$<T>, A, C> => compose1<A, B, C>(f1, f2),
	};
};

export const implArrowAddList = <T>(
	args: ImplsArrowListInput<T>,
): IAAddList<T, ListT$<T>> => ({
	intro: <A, B>(f: $2<T, A, B[]>): $2<ListT$<T>, A, B> => ({
		kind: ListKind.Multiple,
		getMulti: f,
	}),
	elim: runList<T>(args.Option),
});

export const implArrowTrans = <T>(): IATrans<T, List> => ({
	lift: <A, B>(f: $2<T, A, B>): $3<List, T, A, B> => ({
		kind: ListKind.Single,
		get: f,
	}),
});

export const implsArrowList = <T>(
	args: ImplsArrowListInput<T>,
): ImplsArrowListOutput<T> => ({
	trans: implArrowTrans<T>(),
	compose: implArrowCompose<T>(args),
	add: implArrowAddList<T>(args),
});
