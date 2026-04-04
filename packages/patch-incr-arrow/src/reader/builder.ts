import type { ComposeBase, ComposeResidual, IACompose, IAPair } from "@/arrow";
import type { IAReader } from "@/arrowTransformer";
import type { $2 } from "@/hkt";
import type { ImplsArrowReaderInput, ReaderT$, ReaderTRepr } from "./types";

export const runReader =
	<Ctx, T>({ compose }: IACompose<T>, { fst }: IAPair<T>) =>
	<A, B>(repr: $2<ReaderT$<Ctx, T>, A, B>): $2<T, [A, Ctx], B> =>
		repr.reads ? repr.reader : compose(fst(), repr.reader);

export const compose =
	<T>(compose_: ComposeBase<T, WeakKey>, P: IAPair<T>) =>
	<Ctx, A extends WeakKey, B, C>(
		f1: ReaderTRepr<Ctx, T, A, B>,
		f2: ReaderTRepr<Ctx, T, B, C>,
	): ReaderTRepr<Ctx, T, A, C> => {
		if (f1.reads) {
			if (f2.reads) {
				return {
					reads: true,
					reader: compose_<[A, Ctx], [B, Ctx], C>(
						P.pair(f1.reader, P.snd()),
						f2.reader,
					),
				};
			}
			return {
				reads: true,
				reader: compose_(f1.reader, f2.reader),
			};
		}
		if (f2.reads) {
			return {
				reads: true,
				reader: compose_(P.first(f1.reader), f2.reader),
			};
		}
		return {
			reads: false,
			reader: compose_(f1.reader, f2.reader),
		};
	};

export const composeReeval =
	<T>(composeReeval_: ComposeBase<T, unknown>, P: IAPair<T>) =>
	<Ctx, A, B, C>(
		f1: ReaderTRepr<Ctx, T, A, B>,
		f2: ReaderTRepr<Ctx, T, B, C>,
	): ReaderTRepr<Ctx, T, A, C> => {
		if (f1.reads) {
			if (f2.reads) {
				return {
					reads: true,
					reader: composeReeval_<[A, Ctx], [B, Ctx], C>(
						P.pair(f1.reader, P.snd()),
						f2.reader,
					),
				};
			}
			return {
				reads: true,
				reader: composeReeval_(f1.reader, f2.reader),
			};
		}
		if (f2.reads) {
			return {
				reads: true,
				reader: composeReeval_(P.first(f1.reader), f2.reader),
			};
		}
		return {
			reads: false,
			reader: composeReeval_(f1.reader, f2.reader),
		};
	};

export const composeResidual =
	<T>(compose_: ComposeResidual<T>, P: IAPair<T>) =>
	<Ctx, A, B, C>(
		f1: ReaderTRepr<Ctx, T, A, B>,
		f2: ReaderTRepr<Ctx, T, B, C>,
	): ReaderTRepr<Ctx, T, A, [C, unknown]> => {
		if (f1.reads) {
			if (f2.reads) {
				return {
					reads: true,
					reader: compose_<[A, Ctx], [B, Ctx], C>(
						P.pair(f1.reader, P.snd()),
						f2.reader,
					),
				};
			}
			return {
				reads: true,
				reader: compose_(f1.reader, f2.reader),
			};
		}
		if (f2.reads) {
			return {
				reads: true,
				reader: compose_(P.first(f1.reader), f2.reader),
			};
		}
		return {
			reads: false,
			reader: compose_(f1.reader, f2.reader),
		};
	};

export const implAReader = <Ctx, T>({
	compose: c,
	Pair,
}: ImplsArrowReaderInput<T>): IAReader<Ctx, ReaderT$<Ctx, T>> => {
	return {
		read: <A>(): $2<ReaderT$<Ctx, T>, A, Ctx> => ({
			reads: true,
			reader: Pair.snd<A, Ctx>(),
		}),
		newReader: <A, B>(
			f1: $2<ReaderT$<Ctx, T>, A, B>,
		): $2<ReaderT$<Ctx, T>, [A, Ctx], B> => {
			if (f1.reads) {
				return {
					reads: true,
					// overridden context
					reader: c.composeReeval(Pair.fst(), f1.reader),
				};
			}
			return {
				reads: false,
				reader: c.composeReeval(Pair.fst(), f1.reader),
			};
		},
	};
};
