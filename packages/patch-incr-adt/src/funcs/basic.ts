import type { InferApplyValue } from "@/types";
import type { $A, $T } from "@/types/abbr";
import { type IF1, type IFA, IFKind } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";
import { makeIF, makeIFA, REEVAL } from "./helpers";

/** Given an `IF`, convert to an `IFA` by re-evaluating in the `forward` implementation. */
export const fromIFA = <A extends $A, B extends $A>({
	input,
	output,
	evaluate,
	forward,
}: IFA<A, B>): IF1<A, B> => ({
	kind: IFKind.IF1,
	input,
	output,
	evaluate,
	forward: (x, dx, _y) => forward(x, dx),
});

export const atomicFunc = <A extends $A, B extends $A>(
	input: A,
	output: B,
	func: (value: $T<A>) => $T<B>,
	inputEquals = Object.is as (a: $T<A>, b: $T<A>) => boolean,
): IFA<A, B> => {
	return {
		kind: IFKind.IFA,
		input,
		output,
		evaluate: (x) => func(x),
		forward: (x, dx) => {
			if (input.isEmpty(dx)) {
				return output.empty;
			}
			const x1 = input.apply(x, dx);
			if (inputEquals(x, x1)) {
				return output.empty;
			}
			return output.fromReplace(func(x1));
		},
	};
};

/** Given an `IF`, convert to an `IFA` by re-evaluating in the `forward` implementation. */
export const toIFA = <A extends $A, B extends $A>({
	input,
	output,
	evaluate,
	forward,
}: IF1<A, B>): IFA<A, B> => ({
	kind: IFKind.IFA,
	input,
	output,
	evaluate,
	forward: (x, dx) => forward(x, dx, evaluate(x)),
});

export const hole = <A extends $A, B extends $A>(): IFA<A, B> => {
	throw new Error("hole()");
};

export const toIF1 = <A extends $A, B extends $A>({
	input,
	output,
	evaluate,
	forward,
}: IFA<A, B>): IF1<A, B> => {
	return { kind: IFKind.IF1, input, output, evaluate, forward };
};

export const identity = <A extends $A>(a: A): IFA<A, A> => ({
	kind: IFKind.IFA,
	input: a,
	output: a,
	evaluate: (x) => x,
	forward: (_x, dx) => dx,
});

export const constant = <A extends $A, B extends $A>(
	a: A,
	b: B,
	value: $T<B>,
): IFA<A, B> => ({
	kind: IFKind.IFA,
	input: a,
	output: b,
	evaluate: (_) => value,
	forward: (_x, _dx) => b.empty,
});

export const composeWithIsoA = <A extends $A, B extends $A, C extends $A>(
	f1: IF1<A, B>,
	{ fwd: f2, inv: f2i }: IIsoA<B, C>,
): IF1<A, C> => ({
	kind: IFKind.IF1,
	input: f1.input,
	output: f2.output,
	evaluate: (x) => {
		return f2.evaluate(f1.evaluate(x));
	},
	forward: (x, dx, z) => {
		const dy = f1.forward(x, dx, f2i.evaluate(z));
		return f2.forward(x, dy);
	},
});

export const invertA = <A extends $A, B extends $A>({
	fwd,
	inv,
}: IIsoA<A, B>): IIsoA<B, A> => ({ inv: fwd, fwd: inv });

export const condA = <A extends $A, B extends $A>(
	pred: (value: InferApplyValue<A>) => boolean,
	fLeft: IFA<A, B>,
	fRight: IFA<A, B>,
	input = fLeft.input,
	output = fLeft.output,
): IFA<A, B> => {
	return makeIFA(input, output, {
		evaluate: (x) => (pred(x) ? fLeft.evaluate(x) : fRight.evaluate(x)),
		forward: (x, dx) => {
			const x1 = fLeft.input.apply(x, dx);
			const p0 = pred(x);
			const p1 = pred(x1);
			if (p0 !== p1) {
				return REEVAL;
			}
			return p0 ? fLeft.forward(x, dx) : fRight.forward(x, dx);
		},
	});
};

export const cond1 = <A extends $A, B extends $A>(
	pred: (value: InferApplyValue<A>) => boolean,
	fLeft: IF1<A, B>,
	fRight: IF1<A, B>,
	input = fLeft.input,
	output = fLeft.output,
): IF1<A, B> => {
	return makeIF(input, output, {
		evaluate: (x) => (pred(x) ? fLeft.evaluate(x) : fRight.evaluate(x)),
		forward: (x, dx, y) => {
			const x1 = fLeft.input.apply(x, dx);
			const p0 = pred(x);
			const p1 = pred(x1);
			if (p0 !== p1) {
				return REEVAL;
			}
			return p0 ? fLeft.forward(x, dx, y) : fRight.forward(x, dx, y);
		},
	});
};

export const trimA = <A extends $A>(
	func: IFA<A, A>,
	isEqual = Object.is as (a: $T<A>, b: $T<A>) => boolean,
): IFA<A, A> => {
	return makeIFA(func.input, func.output, {
		evaluate: (x) => {
			const y = func.evaluate(x);
			// Return input by reference
			return isEqual(x, y) ? x : y;
			// return y;
		},
		forward: (x, dx) => {
			const dy = func.forward(x, dx);
			const y = func.evaluate(x);
			const y1 = func.output.apply(y, dy);
			return isEqual(y, y1) ? func.output.empty : dy;
		},
	});
};

export * from "./compose/general";
