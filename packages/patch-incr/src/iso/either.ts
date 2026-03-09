import type { Either } from "@/builder/either";
import * as E from "@/builder/either";
import { fromPair } from "./builder";
import type { IIso } from "./types";

export type { Either, Left, Right } from "@/builder/either";

export const left = <A, B, A1>(
	f1: IIso<A, A1>,
): IIso<Either<A, B>, Either<A1, B>> => fromPair(E.left(f1.fw), E.left(f1.bw));

export const right = <A, B, B1>(
	f1: IIso<B, B1>,
): IIso<Either<A, B>, Either<A, B1>> =>
	fromPair(E.right(f1.fw), E.right(f1.bw));

export const leftRight = <A, B, A1, B1>(
	f1: IIso<A, A1>,
	f2: IIso<B, B1>,
): IIso<Either<A, B>, Either<A1, B1>> =>
	fromPair(E.leftRight(f1.fw, f2.fw), E.leftRight(f1.bw, f2.bw));

/** `A + B -> B + A` */
export const flip = <A, B>(): IIso<Either<A, B>, Either<B, A>> =>
	fromPair(E.flip(), E.flip());

/** `A + (B + C) -> (A + B) + C` */
export const assocLeft = <A, B, C>(): IIso<
	Either<A, Either<B, C>>,
	Either<Either<A, B>, C>
> => fromPair(E.assocLeft(), E.assocRight());

/** `(A + B) + C -> A + (B + C)` */
export const assocRight = <A, B, C>(): IIso<
	Either<Either<A, B>, C>,
	Either<A, Either<B, C>>
> => fromPair(E.assocRight(), E.assocLeft());

/** `(A + B) * C -> A * C + B * C` */
export const distRight = <A, B, C>(): IIso<
	[Either<A, B>, C],
	Either<[A, C], [B, C]>
> => fromPair(E.distRight(), E.factorRight());

/** `A * C + B * C -> (A + B) * C` */
export const factorRight = <A, B, C>(): IIso<
	Either<[A, C], [B, C]>,
	[Either<A, B>, C]
> => fromPair(E.factorRight(), E.distRight());

/** `C * (A + B) -> C * A + C * B` */
export const distLeft = <A, B, C>(): IIso<
	[C, Either<A, B>],
	Either<[C, A], [C, B]>
> => fromPair(E.distLeft(), E.factorLeft());

/** `C * A + C * B -> C * (A + B)` */
export const factorLeft = <A, B, C>(): IIso<
	Either<[C, A], [C, B]>,
	[C, Either<A, B>]
> => fromPair(E.factorLeft(), E.distLeft());
