import { type APair, pair } from "@/pair";
import type { UnknownApply } from "@/types";
import type { $A, $T } from "@/types/abbr";
import { type IF1, type IFA, IFKind, type IFR } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";

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

export const composeA = <A extends $A, B extends $A, C extends $A>(
	f1: IFA<A, B>,
	f2: IFA<B, C>,
): IFA<A, C> => ({
	kind: IFKind.IFA,
	input: f1.input,
	output: f2.output,
	evaluate: (x) => f2.evaluate(f1.evaluate(x)),
	forward: (x, dx) => {
		const y = f1.evaluate(x);
		const dy = f1.forward(x, dx);
		return f2.forward(y, dy);
	},
});

export const compose1 = <A extends $A, B extends $A, C extends $A>(
	f1: IF1<A, B>,
	f2: IF1<B, C>,
): IFR<A, C, B> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: pair(f2.output, f1.output),
	evaluate: (x) => {
		const y = f1.evaluate(x);
		return [f2.evaluate(y), y];
	},
	forward: (x, dx, [z, y]) => {
		const dy = f1.forward(x, dx, y);
		return f2.forward(x, dy, z);
	},
});

export const composeA1 = <A extends $A, B extends $A, C extends $A>(
	f1: IFA<A, B>,
	f2: IF1<B, C>,
): IF1<A, C> => ({
	kind: IFKind.IF1,
	input: f1.input,
	output: f2.output,
	evaluate: (x) => f2.evaluate(f1.evaluate(x)),
	forward: (x, dx, z) => {
		const _y = f1.evaluate(x);
		const dy = f1.forward(x, dx);
		return f2.forward(x, dy, z);
	},
});

export const composeAR = <
	A extends $A,
	B extends $A,
	C extends $A,
	R extends $A = UnknownApply,
>(
	f1: IFA<A, B>,
	f2: IFR<B, C, R>,
): IFR<A, C, R> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: f2.output,
	evaluate: (x) => f2.evaluate(f1.evaluate(x)),
	forward: (x, dx, [z, r]) => {
		const dy = f1.forward(x, dx);
		const y = f1.evaluate(x);
		return f2.forward(y, dy, [z, r]);
	},
});

export const compose1A = <A extends $A, B extends $A, C extends $A>(
	f1: IF1<A, B>,
	f2: IFA<B, C>,
): IFR<A, C, B> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: pair(f2.output, f1.output),
	evaluate: (x) => {
		const y = f1.evaluate(x);
		return [f2.evaluate(y), y];
	},
	forward: (x, dx, [_, y]) => {
		const dy = f1.forward(x, dx, y);
		return f2.forward(x, dy);
	},
});

export const compose1R = <
	A extends $A,
	B extends $A,
	C extends $A,
	R extends $A = UnknownApply,
>(
	f1: IF1<A, B>,
	f2: IFR<B, C, R>,
): IFR<A, C, APair<B, R>> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: pair(f2.output.shape[0], pair(f1.output, f2.output.shape[1])),
	evaluate: (x) => {
		const y = f1.evaluate(x);
		const [z, r] = f2.evaluate(y);
		return [z, [y, r]];
	},
	forward: (x, dx, [z, [y, r]]) => {
		const dy = f1.forward(x, dx, y);
		return f2.forward(x, dy, [z, r]);
	},
});

export const composeRA = <
	A extends $A,
	B extends $A,
	C extends $A,
	R extends $A = UnknownApply,
>(
	f1: IFR<A, B, R>,
	f2: IFA<B, C>,
): IFR<A, C, APair<B, R>> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: pair(f2.output, f1.output),
	evaluate: (x) => {
		const [y, r] = f1.evaluate(x);
		return [f2.evaluate(y), r];
	},
	forward: (x, dx, [_, [y, r]]) => {
		const dy = f1.forward(x, dx, [y, r]);
		return f2.forward(x, dy);
	},
});

export const composeR1 = <
	A extends $A,
	B extends $A,
	C extends $A,
	R extends $A = UnknownApply,
>(
	f1: IFR<A, B, R>,
	f2: IF1<B, C>,
): IFR<A, C, APair<B, R>> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: pair(f2.output, f1.output),
	evaluate: (x) => {
		const [y, r] = f1.evaluate(x);
		return [f2.evaluate(y), [y, r]];
	},
	forward: (x, dx, [z, [y, r]]) => {
		const dy = f1.forward(x, dx, [y, r]);
		return f2.forward(x, dy, z);
	},
});

export const composeR = <
	A extends $A,
	B extends $A,
	C extends $A,
	R1 extends $A = UnknownApply,
	R2 extends $A = UnknownApply,
>(
	f1: IFR<A, B, R1>,
	f2: IFR<B, C, R2>,
): IFR<A, C, APair<APair<B, R1>, R2>> => ({
	kind: IFKind.IFR,
	input: f1.input,
	output: pair(f2.output.shape[0], pair(f1.output, f2.output.shape[1])),
	evaluate: (x) => {
		const yr1 = f1.evaluate(x);
		const [y, _r1] = yr1;
		const [_z, r2] = f2.evaluate(x);
		return [f2.evaluate(y), [yr1, r2]];
	},
	forward: (x, dx, [z, [yr1, r2]]) => {
		const dy = f1.forward(x, dx, yr1);
		return f2.forward(x, dy, [z, r2]);
	},
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
