import * as IFPair from "patch-incr/builder/pair";
import type { IAPair } from "@/arrow";
import type { $2 } from "@/hkt";
import type {
	ImplsArrowReaderInput,
	ImplsArrowReaderOutputBasic,
	ReaderT$,
} from "./types";

export const firstSecond = <Ctx, T>({
	compose: { compose: compose_, fromIF: fromIF_ },
	trans: { lift },
	add: { intro },
	Pair,
}: ImplsArrowReaderInput<T> &
	Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add">) => {
	type F = ReaderT$<Ctx, T>;
	return <A, B, A1, B1>(
		f1: $2<F, A, A1>,
		f2: $2<F, B, B1>,
	): $2<F, [A, B], [A1, B1]> => {
		if (f1.reads) {
			if (f2.reads) {
				return intro(
					compose_(
						fromIF_(IFPair.distr()),
						Pair.firstSecond<[A, Ctx], [B, Ctx], A1, B1>(f1.reader, f2.reader),
					),
				);
			}
			return intro(
				compose_(
					fromIF_(IFPair.distrl()),
					Pair.firstSecond<[A, Ctx], B, A1, B1>(f1.reader, f2.reader),
				),
			);
		}
		if (f2.reads) {
			return intro(
				compose_(
					fromIF_(IFPair.distrr()),
					Pair.firstSecond<A, [B, Ctx], A1, B1>(f1.reader, f2.reader),
				),
			);
		}
		return lift(Pair.firstSecond<A, B, A1, B1>(f1.reader, f2.reader));
	};
};

export const pair = <Ctx, T>({
	compose: { composeReeval: composeReeval_ },
	trans: { lift },
	add: { intro },
	Pair,
}: ImplsArrowReaderInput<T> &
	Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add">) => {
	type F = ReaderT$<Ctx, T>;
	return <I extends WeakKey, A, B>(
		f1: $2<F, I, A>,
		f2: $2<F, I, B>,
	): $2<F, I, [A, B]> => {
		if (f1.reads) {
			if (f2.reads) {
				return intro(Pair.pair(f1.reader, f2.reader));
			}
			return intro(Pair.pair(f1.reader, composeReeval_(Pair.fst(), f2.reader)));
		}
		if (f2.reads) {
			return intro(Pair.pair(composeReeval_(Pair.fst(), f1.reader), f2.reader));
		}
		return lift(Pair.pair(f1.reader, f2.reader));
	};
};

export const implPair = <Ctx, T>(
	args: ImplsArrowReaderInput<T> &
		Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add">,
): IAPair<ReaderT$<Ctx, T>> => {
	const {
		trans: { lift },
		compose: { identity: id },
		Pair,
	} = args;
	type F = ReaderT$<Ctx, T>;
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
