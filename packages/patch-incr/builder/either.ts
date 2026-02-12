import type { AnyIF, IF, IFInv } from "../types";
import { atomicFunc, identity } from ".";
import { composeReeval } from "./compose";
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
export const makeRight = <A>(): IFInv<A, Right<A>> => {
	const t = template0((x: A): Right<A> => [true, x]);
	return { ...(t as AnyIF), inverseEvaluate: (t) => t[1] };
};

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
