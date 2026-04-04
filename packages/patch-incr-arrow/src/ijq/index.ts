import type { IF } from "patch-incr/types";
import type { IAReader } from "@/arrowTransformer";
import type { $, Identity } from "@/hkt";
import { impls as implsId } from "@/identity";
import { type ImplsArrowListOutput, implsArrowList, type List } from "@/list";
import { toMultiple } from "@/list/builder";
import { deriveReader as deriveReaderFromList } from "@/list/reader";
import { implsArrowReader, type Reader } from "@/reader";
import { runReader } from "@/reader/builder";

// Ctx : *
// Identity : A
// Reader : * -> (A -> A)
// List : A -> A
// $<Reader, [Ctx]> : A -> A
// $<Reader, [Ctx, Identity]> : A
// $<List, [$<Reader, [Ctx, Identity]>]> : A
export type RCI$<Ctx> = $<Reader, [Ctx, Identity]>;
export type RCI<Ctx, A, B> = $<Reader, [Ctx, Identity, A, B]>;
export type Ijq$<Ctx> = $<List, [RCI$<Ctx>]>;
export type Ijq<Ctx, A, B> = $<List, [RCI$<Ctx>, A, B]>;

const implsRCI = <Ctx>() => implsArrowReader<Ctx, Identity>(implsId);

export const implsIjqList = <Ctx>(): ImplsArrowListOutput<RCI$<Ctx>> & {
	reader: IAReader<Ctx, Ijq$<Ctx>>;
	fromIF<A, B>(fn: IF<A, B>): Ijq<Ctx, A, B>;
	toIF<A, B>(ijq: Ijq<Ctx, A, B>): IF<[A, Ctx], B[]>;
} => {
	const rci = implsRCI<Ctx>();
	const al = implsArrowList<RCI$<Ctx>>(rci);
	const reader: IAReader<Ctx, Ijq$<Ctx>> = deriveReaderFromList<RCI$<Ctx>, Ctx>(
		{
			...al,
			reader: rci.reader,
		},
	);
	const fromIF = <A, B>(fn: IF<A, B>): Ijq<Ctx, A, B> =>
		al.trans.lift(rci.trans.lift(fn));
	const toIF = <A, B>(ijq: Ijq<Ctx, A, B>): IF<[A, Ctx], B[]> => {
		const m = toMultiple<RCI$<Ctx>>(rci.Option)(ijq);

		return runReader<Ctx, Identity>(
			implsId.compose,
			implsId.Pair,
		)<A, B[]>(m.getMulti);
	};
	return { ...al, reader, fromIF, toIF };
};

export const elimIjq = <Ctx, A, B>(f: Ijq<Ctx, A, B>) => {};
