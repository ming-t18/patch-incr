import type { IF } from "patch-incr/types";
import type { IACompose } from "@/arrow";
import type { IAAddList, IATrans } from "@/arrowTransformer";
import type { $2, $3 } from "@/hkt";
import {
	compose,
	composeReeval,
	composeResidual,
	runList,
	single,
} from "./builder";
import { implList } from "./list";
import { implPair } from "./pair";
import { implPlus } from "./plus";
import {
	type ImplsArrowListInput,
	type ImplsArrowListOutput,
	type ImplsArrowListOutputBasic,
	type List,
	ListKind,
	type ListT$,
} from "./types";

export const implArrowCompose = <T>(
	args: ImplsArrowListInput<T>,
): IACompose<ListT$<T>> => {
	const compose1 = compose(args);
	const composeReeval1 = composeReeval(args);
	const composeResidual1 = composeResidual(args);
	const { fromIF, identity } = args.compose;
	return {
		identity: () => single(identity()),
		fromIF: <A, B>(fn: IF<A, B>) => single(fromIF(fn)),
		compose: <A extends WeakKey, B, C>(
			f1: $2<ListT$<T>, A, B>,
			f2: $2<ListT$<T>, B, C>,
		): $2<ListT$<T>, A, C> => compose1<A, B, C>(f1, f2),
		composeReeval: <A, B, C>(
			f1: $2<ListT$<T>, A, B>,
			f2: $2<ListT$<T>, B, C>,
		): $2<ListT$<T>, A, C> => composeReeval1<A, B, C>(f1, f2),
		// TODO doesn't work
		composeResidual: <A, B, C>(
			f1: $2<ListT$<T>, A, B>,
			f2: $2<ListT$<T>, B, C>,
		): $2<ListT$<T>, A, [C, unknown]> => composeResidual1<A, B, C>(f1, f2),
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

export const implsArrowListBasic = <T>(
	args: ImplsArrowListInput<T>,
): ImplsArrowListOutputBasic<T> => ({
	trans: implArrowTrans<T>(),
	compose: implArrowCompose<T>(args),
	add: implArrowAddList<T>(args),
});

export const implsArrowList = <T>(
	args: ImplsArrowListInput<T>,
): ImplsArrowListOutput<T> => {
	const implsBasic = implsArrowListBasic(args);
	return {
		...implsBasic,
		Pair: implPair<T>({
			...args,
			trans: implsBasic.trans,
			add: implsBasic.add,
		}),
		plus: implPlus<T>(args),
		list: implList<T>(args),
	};
};
