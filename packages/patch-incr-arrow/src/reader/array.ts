import type { IAArray } from "@/arrow";
import type { $2 } from "@/hkt";
import type {
	ImplsArrowReaderInput,
	ImplsArrowReaderOutputBasic,
	ReaderT$,
} from "./types";

export const implArray = <Ctx, T>(
	args: ImplsArrowReaderInput<T> &
		Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add">,
): IAArray<ReaderT$<Ctx, T>> => {
	const {
		trans: { lift },
		compose: { compose: compose_ },
		Arr,
		add: { intro },
	} = args;
	type F = ReaderT$<Ctx, T>;
	return {
		map: <A, B>(f1: $2<F, A, B>): $2<F, A[], B[]> => {
			if (f1.reads) {
				return intro(compose_(Arr.distr(), Arr.map(f1.reader)));
			}
			return lift(Arr.map(f1.reader));
		},
		flatMap: <A, B>(f1: $2<F, A, B[]>): $2<F, A[], B[]> => {
			if (f1.reads) {
				return intro(compose_(Arr.distr(), Arr.flatMap(f1.reader)));
			}
			return lift(Arr.flatMap(f1.reader));
		},
		distr: () => lift(Arr.distr()),
	};
};
