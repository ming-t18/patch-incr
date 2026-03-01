import type { AnyIF, AnyIFInv, IF, IFInv } from "../types";
import { atomicFunc, identity } from ".";
import { composeReeval, composeWithInv } from "./compose";
import { cond, condSingle } from "./cond";
import * as Pair from "./pair";
import { access } from "./struct/access";
import { template0 } from "./struct/template";

export type Left<A> = [false, A];
export type Right<A> = [true, A];

export type Either<A, B> = Left<A> | Right<B>;

export const isLeftF = <A, B>([f]: Either<A, B>) => !f;
export const isRightF = <A, B>([f]: Either<A, B>) => f;

const getLeft = <T>() => access<T, 1, Left<T>>(1);
const getRight = <T>() => access<T, 1, Right<T>>(1);

export const intro = <I, A, B>(
	pred: (value: I) => boolean,
	ifTrue: IF<I, A>,
	ifFalse: IF<I, B>,
): IF<I, Either<A, B>> => {
	return cond((x) => !pred(x), ifFalse, ifTrue);
};

export const elim = <A, B, C>(
	onLeft: IF<A, C>,
	onRight: IF<B, C>,
): IF<Either<A, B>, C> => {
	const leftPart: IF<Left<A>, C> = composeReeval(getLeft(), onLeft);
	const rightPart: IF<Right<B>, C> = composeReeval(getRight(), onRight);
	return condSingle<Either<A, B>, C, C, Right<B>, Left<A>>(
		isRightF,
		rightPart,
		leftPart,
	);
};

export const isLeft = <A, B>() => atomicFunc(([f]: Either<A, B>) => !f);
export const isRight = <A, B>() => atomicFunc(([f]: Either<A, B>) => f);

export const makeLeft = <A>(): IFInv<A, Left<A>> => {
	const t = template0((x: A): Left<A> => [false, x]);
	return { ...(t as AnyIF), inverseEvaluate: (t) => t[1] };
};
export const makeLeft1 = <A, B>(): IFInv<A, Either<A, B>> =>
	makeLeft<A>() as never;

export const makeRight = <A>(): IFInv<A, Right<A>> => {
	const t = template0((x: A): Right<A> => [true, x]);
	return { ...(t as AnyIF), inverseEvaluate: (t) => t[1] };
};
export const makeRight1 = <A, B>(): IFInv<B, Either<A, B>> =>
	makeRight<B>() as never;

export const left = <A, B, A1>(
	f1: IF<A, A1>,
): IF<Either<A, B>, Either<A1, B>> => {
	return condSingle<Either<A, B>, Left<A1>, Right<B>, Left<A>, Right<B>>(
		isLeftF,
		Pair.second(f1),
		identity(),
	);
};

export const right = <A, B, B1>(
	f2: IF<B, B1>,
): IF<Either<A, B>, Either<A, B1>> => {
	return condSingle<Either<A, B>, Left<A>, Right<B1>, Left<A>, Right<B>>(
		isLeftF,
		identity(),
		Pair.second(f2),
	);
};

export const leftRight = <A, B, A1, B1>(
	f1: IF<A, A1>,
	f2: IF<B, B1>,
): IF<Either<A, B>, Either<A1, B1>> => {
	return condSingle<Either<A, B>, Left<A1>, Right<B1>, Left<A>, Right<B>>(
		isLeftF,
		Pair.second(f1),
		Pair.second(f2),
	);
};

/** `A + (B + C) -> (A + B) + C` */
export const assocLeft = <A, B, C>(): IF<
	Either<A, Either<B, C>>,
	Either<Either<A, B>, C>
> => {
	return elim(
		composeWithInv(makeLeft1<A, B>(), makeLeft1()),
		elim(composeWithInv(makeRight1<A, B>(), makeLeft1()), makeRight1()),
	);
};

/** `(A + B) + C -> A + (B + C)` */
export const assocRight = <A, B, C>(): IF<
	Either<Either<A, B>, C>,
	Either<A, Either<B, C>>
> => {
	return elim(
		elim(makeLeft1(), composeWithInv(makeLeft1<B, C>(), makeRight1())),
		composeWithInv(makeRight1<B, C>(), makeRight1()),
	);
};

/** `(A + B) * C -> A * C + B * C` */
export const distRight = <A, B, C>(): IFInv<
	[Either<A, B>, C],
	Either<[A, C], [B, C]>
> => {
	// [[boolean, A|B], C] -> [boolean, [A|B, C]]
	// = [false, [A, C]] | [true, [B, C]]
	const pairOp = Pair.assocRight<boolean, A | B, C>();
	return pairOp as AnyIFInv;
};

/** `A * C + B * C -> (A + B) * C` */
export const factorRight = <A, B, C>(): IF<
	Either<[A, C], [B, C]>,
	[Either<A, B>, C]
> => {
	return Pair.assocLeft<boolean, A | B, C>() as AnyIFInv;
};

/** `C * (A + B) -> C * A + C * B` */
export const distLeft = <A, B, C>(): IF<
	[C, Either<A, B>],
	Either<[C, A], [C, B]>
> => {
	// [C, [boolean, A|B]] -> [boolean, [C, A|B]]
	// = [false, [A, C]] | [true, [B, C]]
	const pairOp = Pair.abc_bac<C, boolean, A | B>();
	return pairOp as AnyIFInv;
};

/** `C * A + C * B -> C * (A + B)` */
export const factorLeft = <A, B, C>(): IF<
	Either<[C, A], [C, B]>,
	[C, Either<A, B>]
> => {
	return Pair.abc_bac() as AnyIFInv;
};
