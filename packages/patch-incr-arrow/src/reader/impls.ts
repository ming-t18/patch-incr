import type { IF } from "patch-incr/types";
import type { IACompose } from "@/arrow";
import type { IAAddReader, IATrans } from "@/arrowTransformer";
import type { $1, $2, $3 } from "@/hkt";
import { implArray } from "./array";
import { compose, composeReeval, runReader } from "./builder";
import { implChoice } from "./choice";
import { implOption } from "./option";
import { implPair } from "./pair";
import type {
	ImplsArrowReaderInput,
	ImplsArrowReaderOutput,
	ImplsArrowReaderOutputBasic,
	Reader,
	ReaderT$,
} from "./types";

export const implArrowCompose = <Ctx, T>(
	args: ImplsArrowReaderInput<T>,
): IACompose<ReaderT$<Ctx, T>> => {
	const compose1 = compose(args.compose.compose, args.pair);
	const composeReeval1 = composeReeval(args.compose.composeReeval, args.pair);
	const { identity, fromIF } = args.compose;
	return {
		identity: <A>(): $2<ReaderT$<Ctx, T>, A, A> => ({
			reads: false,
			reader: identity<A>(),
		}),
		fromIF: <A, B>(fn: IF<A, B>): $2<ReaderT$<Ctx, T>, A, B> => ({
			reads: false,
			reader: fromIF(fn),
		}),
		compose: <A extends WeakKey, B, C>(
			f1: $2<ReaderT$<Ctx, T>, A, B>,
			f2: $2<ReaderT$<Ctx, T>, B, C>,
		): $2<ReaderT$<Ctx, T>, A, C> => compose1<Ctx, A, B, C>(f1, f2),
		composeReeval: <A, B, C>(
			f1: $2<ReaderT$<Ctx, T>, A, B>,
			f2: $2<ReaderT$<Ctx, T>, B, C>,
		): $2<ReaderT$<Ctx, T>, A, C> => composeReeval1<Ctx, A, B, C>(f1, f2),
	};
};

export const implArrowTrans = <Ctx, T>(): IATrans<T, $1<Reader, Ctx>> => ({
	lift: <A, B>(f: $2<T, A, B>): $3<$1<Reader, Ctx>, T, A, B> => ({
		reads: false,
		reader: f,
	}),
});

export const implArrowAddReader = <Ctx, T>({
	compose,
	pair,
}: ImplsArrowReaderInput<T>): IAAddReader<Ctx, T, ReaderT$<Ctx, T>> => ({
	intro: <A, B>(f: $2<T, [A, Ctx], B>): $2<ReaderT$<Ctx, T>, A, B> => ({
		reads: true,
		reader: f,
	}),
	elim: runReader<Ctx, T>(compose, pair),
});

export const implsArrowReader = <Ctx, T>(
	args: ImplsArrowReaderInput<T>,
): ImplsArrowReaderOutputBasic<Ctx, T> => {
	return {
		trans: implArrowTrans(),
		compose: implArrowCompose(args),
		add: implArrowAddReader(args),
	};
};

export const implsArrowReader1 = <Ctx, T>(
	args: ImplsArrowReaderInput<T>,
): ImplsArrowReaderOutput<Ctx, T> => {
	const { trans, add, compose } = implsArrowReader<Ctx, T>(args);
	const args1 = {
		...args,
		trans,
		add,
		option: args.option,
		choice: args.choice,
	};
	return {
		trans,
		compose,
		add,
		pair: implPair(args1),
		option: implOption(args1),
		choice: implChoice(args1),
		array: implArray(args1),
	};
};
