import { cartesian } from "patch-incr/builder/array";
import { type Option, prod } from "patch-incr/builder/option";
import type { IAPair } from "@/arrow";
import type { $2 } from "@/hkt";
import { toMultiple, toOptional } from "./builder";
import {
	type ImplsArrowListInput,
	type ImplsArrowListOutputBasic,
	ListKind,
	type ListT$,
} from "./types";

export const firstSecond = <T>(
	args: ImplsArrowListInput<T> & Pick<ImplsArrowListOutputBasic<T>, "trans">,
) => {
	const {
		compose: { compose: compose_, fromIF: fromIF_ },
		Pair,
		trans: { lift },
		Option,
	} = args;
	type F = ListT$<T>;
	return <A, B, A1, B1>(
		f1: $2<F, A, A1>,
		f2: $2<F, B, B1>,
	): $2<F, [A, B], [A1, B1]> => {
		if (f1.kind === ListKind.Single && f2.kind === ListKind.Single) {
			return lift(Pair.firstSecond<A, B, A1, B1>(f1.get, f2.get));
		}
		if (f1.kind === ListKind.Multiple || f2.kind === ListKind.Multiple) {
			const m1 = toMultiple(Option)(f1);
			const m2 = toMultiple(Option)(f2);
			return lift(
				compose_(
					Pair.firstSecond<A, B, A1[], B1[]>(m1.getMulti, m2.getMulti),
					fromIF_(cartesian<A1, B1>()),
				),
			);
		}
		const m1 = toOptional(Option)(f1);
		const m2 = toOptional(Option)(f2);
		return lift(
			compose_(
				Pair.firstSecond<A, B, Option<A1>, Option<B1>>(m1.getOpt, m2.getOpt),
				prod(),
			),
		);
	};
};

export const pair = <T>(
	args: ImplsArrowListInput<T> &
		Pick<ImplsArrowListOutputBasic<T>, "trans" | "add">,
) => {
	const {
		Pair,
		compose: { compose: compose_, fromIF: fromIF_ },
		trans: { lift },
		add: { intro },
		Option,
	} = args;
	type F = ListT$<T>;
	return <I extends WeakKey, A, B>(
		f1: $2<F, I, A>,
		f2: $2<F, I, B>,
	): $2<F, I, [A, B]> => {
		if (f1.kind === ListKind.Single && f2.kind === ListKind.Single) {
			return lift(Pair.pair<I, A, B>(f1.get, f2.get));
		}
		const m1 = toMultiple<T>(Option)<I, A>(f1);
		const m2 = toMultiple<T>(Option)<I, B>(f2);
		return intro(
			compose_<I, [A[], B[]], [A, B][]>(
				Pair.pair<I, A[], B[]>(m1.getMulti, m2.getMulti),
				fromIF_(cartesian<A, B>()),
			),
		);
	};
};

export const implPair = <T>(
	args: ImplsArrowListInput<T> &
		Pick<ImplsArrowListOutputBasic<T>, "trans" | "add">,
): IAPair<ListT$<T>> => {
	const {
		trans: { lift },
		compose: { identity: id },
		Pair,
	} = args;
	type F = ListT$<T>;
	return {
		fst: <A, B>(): $2<F, [A, B], A> => lift(Pair.fst()),
		snd: <A, B>(): $2<F, [A, B], B> => lift(Pair.snd()),
		first: <A, B, A1>(f1: $2<F, A, A1>): $2<F, [A, B], [A1, B]> =>
			firstSecond(args)(f1, lift(id<B>())),
		second: <A, B, B1>(f2: $2<F, B, B1>): $2<F, [A, B], [A, B1]> =>
			firstSecond(args)(lift(id<A>()), f2),
		firstSecond: firstSecond(args),
		pair: pair(args),
		distr: () => lift(Pair.distr()),
	};
};
