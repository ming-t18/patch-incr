import type { APair } from "@/pair";
import { pair } from "@/pair";
import type { UnknownApply } from "@/types";
import type { $A, $D } from "@/types/abbr";
import { type IF, type IF1, type IFA, IFKind, type IFR } from "@/types/func";

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
): IFR<A, C, B> => {
	const output = pair(f2.output, f1.output);
	return {
		kind: IFKind.IFR,
		input: f1.input,
		output,
		evaluate: (x) => {
			const y = f1.evaluate(x);
			return [f2.evaluate(y), y];
		},
		forward: (x, dx, [z, y]) => {
			const dy = f1.forward(x, dx, y);
			const dz = f2.forward(y, dy, z);

			// Required to pass prop test on empty patch
			if (output.shape[0].isEmpty(dz) && output.shape[1].isEmpty(dy)) {
				return f2.output.empty;
			}
			return [dz, dy];
		},
	};
};

export const composeA1 = <A extends $A, B extends $A, C extends $A>(
	f1: IFA<A, B>,
	f2: IF1<B, C>,
): IF1<A, C> => ({
	kind: IFKind.IF1,
	input: f1.input,
	output: f2.output,
	evaluate: (x) => f2.evaluate(f1.evaluate(x)),
	forward: (x, dx, z) => {
		const dy = f1.forward(x, dx);
		const y = f1.evaluate(x);
		return f2.forward(y, dy, z);
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
		return f2.forward(y, dy);
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
): IFR<A, C, APair<B, R>> => {
	const br: APair<B, R> = pair(f1.output, f2.output.shape[1]);
	const cr: APair<C, R> = f2.output;
	const cbr: APair<C, APair<B, R>> = pair(f2.output.shape[0], br);
	return {
		kind: IFKind.IFR,
		input: f1.input,
		output: cbr,
		evaluate: (x) => {
			const y = f1.evaluate(x);
			const [z, r] = f2.evaluate(y);
			return [z, [y, r]];
		},
		forward: (x, dx, [z, [y, r]]): $D<typeof cbr> => {
			const dy: $D<B> = f1.forward(x, dx, y);
			const dzr: $D<APair<C, R>> = f2.forward(y, dy, [z, r]);
			const [dz, dr] = cr.project(null, dzr);
			// Required to pass prop test on empty patch
			if (
				cr.shape[0].isEmpty(dz) &&
				cr.shape[1].isEmpty(dr) &&
				f1.output.isEmpty(dy)
			) {
				return cbr.empty;
			}
			return [dz, [dy, dr]];
		},
	};
};

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
		return f2.forward(y, dy);
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
		return f2.forward(y, dy, z);
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
		return f2.forward(yr1[0], dy, [z, r2]);
	},
});

/**
 * The overload-based signature for the binary incremental function composition
 * operation.
 *
 * The basic idea is to avoid re-evaluating `IF1/IFR` in the `forward` methods of
 * `IF1/IFR` by adding the intermediate result of type `B` in the residual.
 *
 *  - `IFA >> IFA = IFA`
 *  - `? >> IFA = IF1`
 *  - `IFA >> ? = IF1`
 *  - `IF1 >> IF1 = IFR`
 *  - `IFR >> ? = IFR`
 *  - `? >> IFR = IFR`
 */
export interface ComposeFunc {
	// IFA
	<A extends $A, B extends $A, C extends $A>(
		f1: IFA<A, B>,
		f2: IFA<B, C>,
	): IFA<A, C>;
	<A extends $A, B extends $A, C extends $A>(
		f1: IFA<A, B>,
		f2: IF1<B, C>,
	): IF1<A, C>;
	<A extends $A, B extends $A, C extends $A, R extends $A>(
		f1: IFA<A, B>,
		f2: IFR<B, C, R>,
	): IFR<A, C, R>;

	// IF1
	<A extends $A, B extends $A, C extends $A>(
		f1: IF1<A, B>,
		f2: IFA<B, C>,
	): IFR<A, C, B>;
	<A extends $A, B extends $A, C extends $A>(
		f1: IF1<A, B>,
		f2: IF1<B, C>,
	): IFR<A, C, B>;
	<A extends $A, B extends $A, C extends $A, R extends $A>(
		f1: IF1<A, B>,
		f2: IFR<B, C, R>,
	): IFR<A, C, APair<B, R>>;

	// IFR
	<A extends $A, B extends $A, C extends $A, R extends $A>(
		f1: IFR<A, B, R>,
		f2: IFA<B, C>,
	): IFR<A, C, APair<B, R>>;
	<A extends $A, B extends $A, C extends $A, R extends $A>(
		f1: IFR<A, B, R>,
		f2: IF1<B, C>,
	): IFR<A, C, APair<B, R>>;
	<A extends $A, B extends $A, C extends $A, R1 extends $A, R2 extends $A>(
		f1: IFR<A, B, R1>,
		f2: IFR<B, C, R2>,
	): IFR<A, C, APair<APair<B, R1>, R2>>;

	// General
	<A extends $A, B extends $A, C extends $A>(
		f1: IF<A, B>,
		f2: IF<B, C>,
	): IF<A, C>;
}

export const composeNonOverload = <A extends $A, B extends $A, C extends $A>(
	f1: IF<A, B>,
	f2: IF<B, C>,
): IF<A, C> => {
	if (f1.kind === IFKind.IFA) {
		if (f2.kind === IFKind.IFA) {
			return composeA(f1, f2);
		}
		if (f2.kind === IFKind.IF1) {
			return composeA1(f1, f2);
		}
		if (f2.kind === IFKind.IFR) {
			return composeAR(f1, f2);
		}
		return f2 satisfies never;
	}
	if (f1.kind === IFKind.IF1) {
		if (f2.kind === IFKind.IFA) {
			return compose1A(f1, f2);
		}
		if (f2.kind === IFKind.IF1) {
			return compose1(f1, f2);
		}
		if (f2.kind === IFKind.IFR) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return compose1R(f1, f2) as IFR<A, C, any>;
		}
		return f2 satisfies never;
	}
	if (f1.kind === IFKind.IFR) {
		if (f2.kind === IFKind.IFA) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return composeRA(f1, f2) as IFR<A, C, any>;
		}
		if (f2.kind === IFKind.IF1) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return composeR1(f1, f2) as IFR<A, C, any>;
		}
		if (f2.kind === IFKind.IFR) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return composeR(f1, f2) as IFR<A, C, any>;
		}
		return f2 satisfies never;
	}
	return f1 satisfies never;
};

export const compose = composeNonOverload as ComposeFunc;
