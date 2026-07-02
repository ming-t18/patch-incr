import { type APair, pair } from "@/pair";
import type { $A, $T } from "@/types/abbr";
import type { IF, IFA } from "@/types/func";

/** Given an `IF`, convert to an `IFA` by re-evaluating in the `forward` implementation. */
export const fromIFA = <A extends $A, B extends $A>({
	input,
	output,
	evaluate,
	forward,
}: IFA<A, B>): IF<A, B> => ({
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
}: IF<A, B>): IFA<A, B> => ({
	input,
	output,
	evaluate,
	forward: (x, dx) => forward(x, dx, evaluate(x)),
});

export const identity = <A extends $A>(a: A): IFA<A, A> => ({
	input: a,
	output: a,
	evaluate: (x) => x,
	forward: (_x, dx, _y) => dx,
});

export const constant = <A extends $A, B extends $A>(
	a: A,
	b: B,
	value: $T<B>,
): IFA<A, B> => ({
	input: a,
	output: b,
	evaluate: (_) => value,
	forward: (_x, _dx, _y) => b.empty,
});

export const composeA = <A extends $A, B extends $A, C extends $A>(
	f1: IFA<A, B>,
	f2: IFA<B, C>,
): IFA<A, C> => ({
	input: f1.input,
	output: f2.output,
	evaluate: (x) => f2.evaluate(f1.evaluate(x)),
	forward: (x, dx, z) => {
		const y = f1.evaluate(x);
		const dy = f1.forward(x, dx, y);
		return f2.forward(x, dy, z);
	},
});

export const composeR = <A extends $A, B extends $A, C extends $A>(
	f1: IF<A, B>,
	f2: IF<B, C>,
): IF<A, APair<C, B>> => ({
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
