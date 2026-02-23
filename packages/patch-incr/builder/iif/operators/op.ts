import { atomicFunc } from "@/builder";
import { composeWith, isNode, makeFork } from "../node";
import type { Operator } from "../types";

export const makeUnOp = <A, B>(func: (a: A) => B): Operator<[A], B> => {
	const binOp = (a: A): B => {
		if (isNode<A>(a)) {
			return composeWith(
				a,
				atomicFunc<A, B>((a1) => func(a1)),
			) as B;
		}
		return func(a);
	};
	return binOp;
};

export const makeBinOp = <A, B, C>(
	func: (a: A, b: B) => C,
): Operator<[A, B], C> => {
	const binOp = (a: A, b: B): C => {
		if (isNode<A>(a) && isNode<B>(b)) {
			return composeWith(
				makeFork(a, b),
				atomicFunc<[A, B], C>(([a1, b1]) => func(a1, b1)),
			) as C;
		}
		return func(a, b);
	};
	return binOp;
};

export const not = makeUnOp((a: boolean): boolean => !a);

export const add = makeBinOp((a: number, b: number): number => a + b);

export const sub = makeBinOp((a: number, b: number): number => a - b);

export const mult = makeBinOp((a: number, b: number): number => a * b);

export const div = makeBinOp((a: number, b: number): number => a / b);

export const stringLength = makeUnOp((a: string) => a.length);
