import type { Option } from "patch-incr/builder/option";
import type { IAOption } from "@/arrow";
import type { $2 } from "@/hkt";
import type {
	ImplsArrowReaderInput,
	ImplsArrowReaderOutputBasic,
	ReaderT$,
} from "./types";

const optionCompose = <Ctx, T>(
	args: ImplsArrowReaderInput<T> &
		Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add"> & {
			option: IAOption<T>;
		},
) => {
	type F = ReaderT$<Ctx, T>;
	const {
		trans: { lift },
		compose: { compose: compose_ },
		option: Option,
		pair: Pair,
		add: { intro },
	} = args;
	return <A extends WeakKey, B, C>(
		f1: $2<F, A, Option<B>>,
		f2: $2<F, B, Option<C>>,
	): $2<F, A, Option<C>> => {
		if (f1.reads) {
			if (f2.reads) {
				return intro(
					Option.compose(
						compose_(Pair.pair(f1.reader, Pair.snd()), Option.distr()),
						f2.reader,
					),
				);
			}
			return intro(Option.compose(f1.reader, f2.reader));
		}
		if (f2.reads) {
			return intro(
				Option.compose(
					compose_(Pair.first(f1.reader), Option.distr()),
					f2.reader,
				),
			);
		}
		return lift(Option.compose(f1.reader, f2.reader));
	};
};

export const implOption = <Ctx, T>(
	args: ImplsArrowReaderInput<T> &
		Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add"> & {
			option: IAOption<T>;
		},
): IAOption<ReaderT$<Ctx, T>> => {
	const {
		trans: { lift },
		compose: { composeReeval: composeReeval_ },
		option: Option,
		add: { intro },
	} = args;
	type F = ReaderT$<Ctx, T>;
	return {
		just: <A, B>(f1: $2<F, A, B>): $2<F, A, [B]> => {
			if (f1.reads) {
				return intro(Option.just(f1.reader));
			}
			return lift(Option.just(f1.reader));
		},
		compose: optionCompose(args),
		map: <A, B>(f1: $2<F, A, B>): $2<F, Option<A>, Option<B>> => {
			if (f1.reads) {
				return intro(composeReeval_(Option.distr(), Option.map(f1.reader)));
			}
			return lift(Option.map(f1.reader));
		},
		flatMap: <A, B>(f1: $2<F, A, Option<B>>): $2<F, Option<A>, Option<B>> => {
			if (f1.reads) {
				return intro(composeReeval_(Option.distr(), Option.flatMap(f1.reader)));
			}
			return lift(Option.flatMap(f1.reader));
		},
		distr: () => lift(Option.distr()),
	};
};
