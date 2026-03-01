import type { Either, Left, Right } from "@/builder/either";
import * as E from "@/builder/either";
import { fromPair } from "./builder";
import type { IIso } from "./types";

export const left = <A, B, A1>(
	f1: IIso<A, A1>,
): IIso<Either<A, B>, Either<A1, B>> => fromPair(E.left(f1.fw), E.left(f1.bw));

export const rights = <A, B, B1>(
	f1: IIso<B, B1>,
): IIso<Either<A, B>, Either<A, B1>> =>
	fromPair(E.right(f1.fw), E.right(f1.bw));

export const leftRight = <A, B, A1, B1>(
	f1: IIso<A, A1>,
	f2: IIso<B, B1>,
): IIso<Either<A, B>, Either<A1, B1>> =>
	fromPair(E.leftRight(f1.fw, f2.fw), E.leftRight(f1.bw, f2.fw));
