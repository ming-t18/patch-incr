import type { Either } from "patch-incr/builder/either";
import type { IAChoice, IAPair } from "@/arrow";
import type { $2 } from "@/hkt";
import type {
	ImplsArrowReaderInput,
	ImplsArrowReaderOutputBasic,
	ReaderT$,
} from "./types";

export const implChoice = <Ctx, T>(
	args: ImplsArrowReaderInput<T> &
		Pick<ImplsArrowReaderOutputBasic<Ctx, T>, "trans" | "add"> & {
			choice: IAChoice<T>;
			pair: IAPair<T>;
		},
): IAChoice<ReaderT$<Ctx, T>> => {
	const {
		trans: { lift },
		compose: { composeReeval: composeReeval_ },
		choice: Choice,
		pair: Pair,
		add: { intro },
	} = args;
	type F = ReaderT$<Ctx, T>;
	return {
		left: <A, B, A1>(f1: $2<F, A, A1>): $2<F, Either<A, B>, Either<A1, B>> => {
			if (f1.reads) {
				return intro(
					composeReeval_(
						Choice.distr<A, B, Ctx>(),
						Choice.leftRight(f1.reader, Pair.fst()),
					),
				);
			}
			return lift(Choice.left(f1.reader));
		},
		right: <A, B, B1>(f2: $2<F, B, B1>): $2<F, Either<A, B>, Either<A, B1>> => {
			if (f2.reads) {
				return intro(
					composeReeval_(
						Choice.distr<A, B, Ctx>(),
						Choice.leftRight(Pair.fst(), f2.reader),
					),
				);
			}
			return lift(Choice.right(f2.reader));
		},
		leftRight: <A, B, A1, B1>(
			f1: $2<F, A, A1>,
			f2: $2<F, B, B1>,
		): $2<F, Either<A, B>, Either<A1, B1>> => {
			if (!f1.reads && !f2.reads) {
				return lift(Choice.leftRight(f1.reader, f2.reader));
			}
			return intro(
				composeReeval_(
					Choice.distr<A, B, Ctx>(),
					Choice.leftRight(
						f1.reads ? f1.reader : composeReeval_(Pair.fst(), f1.reader),
						f2.reads ? f2.reader : composeReeval_(Pair.fst(), f2.reader),
					),
				),
			);
		},
		elim: <A, B, C>(
			f1: $2<F, A, C>,
			f2: $2<F, B, C>,
		): $2<F, Either<A, B>, C> => {
			if (!f1.reads && !f2.reads) {
				return lift(Choice.elim(f1.reader, f2.reader));
			}
			return intro(
				composeReeval_(
					Choice.distr<A, B, Ctx>(),
					Choice.elim(
						f1.reads ? f1.reader : composeReeval_(Pair.fst(), f1.reader),
						f2.reads ? f2.reader : composeReeval_(Pair.fst(), f2.reader),
					),
				),
			);
		},
		distr: () => lift(Choice.distr()),
	};
};
