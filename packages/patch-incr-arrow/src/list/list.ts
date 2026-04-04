import { singleton } from "patch-incr/builder";
import type { Option } from "patch-incr/builder/option";
import type { IAList } from "@/arrowTransformer";
import type { $2 } from "@/hkt";
import { single } from "./builder";
import { type ImplsArrowListInput, ListKind, type ListT$ } from "./types";

export const collect =
	<T>({ compose: { compose: compose_, fromIF } }: ImplsArrowListInput<T>) =>
	<A extends WeakKey, B>(f: $2<ListT$<T>, A, B>): $2<ListT$<T>, A, B[]> => {
		if (f.kind === ListKind.Multiple) {
			return single(f.getMulti);
		}
		if (f.kind === ListKind.Optional) {
			return single(
				f.getOpt satisfies $2<T, A, Option<B>> as never as $2<T, A, B[]>,
			);
		}
		return single(compose_(f.get, fromIF(singleton<B>())));
	};

export const implList = <T>(
	args: ImplsArrowListInput<T>,
): IAList<ListT$<T>> => {
	return {
		collect: collect(args),
	};
};
