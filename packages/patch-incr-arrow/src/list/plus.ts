import { constant } from "patch-incr/builder";
import { concatSingle } from "patch-incr/builder/array";
import { Nothing, type Option } from "patch-incr/builder/option";
import type { IAImpls, IAPlus } from "@/arrow";
import type { $2 } from "@/hkt";
import { toMultiple } from "./builder";
import { type ImplsArrowListInput, ListKind, type ListT$ } from "./types";

export const empty =
	<T>({
		compose: { fromIF },
	}: Pick<ImplsArrowListInput<T> & IAImpls<T>, "compose" | "Option">) =>
	<A, B>(): $2<ListT$<T>, A, B> => ({
		kind: ListKind.Optional,
		getOpt: fromIF(constant<Option<B>, A>(Nothing)),
	});

export const plus =
	<T>({
		compose: { compose, fromIF },
		Option,
		Pair,
	}: Pick<
		ImplsArrowListInput<T> & IAImpls<T>,
		"compose" | "Option" | "Pair"
	>) =>
	<A extends WeakKey, B>(
		f1: $2<ListT$<T>, A, B>,
		f2: $2<ListT$<T>, A, B>,
	): $2<ListT$<T>, A, B> => {
		const m1 = toMultiple(Option)(f1);
		const m2 = toMultiple(Option)(f2);
		const m1m2: $2<T, A, [B[], B[]]> = Pair.pair<A, B[], B[]>(
			m1.getMulti,
			m2.getMulti,
		);
		return {
			kind: ListKind.Multiple,
			getMulti: compose(
				m1m2 as never as $2<T, A, B[][]>,
				fromIF(concatSingle<B>()),
			),
		};
	};

export const sum =
	<T>(
		args: Pick<
			ImplsArrowListInput<T> & IAImpls<T>,
			"compose" | "Option" | "Pair"
		>,
	) =>
	<A extends WeakKey, B>(fs: $2<ListT$<T>, A, B>[]): $2<ListT$<T>, A, B> => {
		if (fs.length === 0) {
			return empty<T>(args)();
		}
		// biome-ignore lint/style/noNonNullAssertion: array length guarantee
		let res = fs[0]!;
		if (fs.length === 1) {
			return res;
		}
		const plus_ = plus<T>(args);
		for (let i = 1; i < fs.length; i++) {
			// biome-ignore lint/style/noNonNullAssertion: indexing guarantee
			res = plus_(res, fs[i]!);
		}
		return res;
	};

export const implPlus = <T>(
	args: Pick<
		ImplsArrowListInput<T> & IAImpls<T>,
		"compose" | "Option" | "Pair"
	>,
): IAPlus<ListT$<T>> => ({
	empty: empty(args),
	plus: plus(args),
	sum: sum(args),
});
