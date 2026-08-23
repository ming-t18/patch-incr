import { makeIF1, makeIFA, makeIFR } from "@/funcs/helpers";
import type { $A } from "@/types/abbr";
import { type IF, type IF1, type IFA, IFKind, type IFR } from "@/types/func";
import { type APair, pair } from "./pair";

export const forkA =
	<C extends $A>(input: C) =>
	<A extends $A, B extends $A>(
		f1: IFA<C, A>,
		f2: IFA<C, B>,
	): IFA<C, APair<A, B>> =>
		makeIFA(input, pair(f1.output, f2.output), {
			evaluate: (x) => [f1.evaluate(x), f2.evaluate(x)],
			forward: (x, dx) => [f1.forward(x, dx), f2.forward(x, dx)],
		});

export const fork1 =
	<C extends $A>(input: C) =>
	<A extends $A, B extends $A>(
		f1: IFA<C, A> | IF1<C, A>,
		f2: IFA<C, B> | IF1<C, B>,
	): IF1<C, APair<A, B>> =>
		makeIF1(input, pair(f1.output, f2.output), {
			evaluate: (x) => [f1.evaluate(x), f2.evaluate(x)],
			forward: (x, dx, [y1, y2]) => [
				f1.forward(x, dx, y1),
				f2.forward(x, dx, y2),
			],
		});

export const forkRL =
	<C extends $A>(input: C) =>
	<A extends $A, B extends $A, R1 extends $A>(
		f1: IFR<C, A, R1>,
		f2: IFA<C, B> | IF1<C, B>,
	): IFR<C, APair<A, B>, R1> => {
		const output = pair(f1.output.shape[0], f2.output);
		const residual = f1.output.shape[1];
		return makeIFR(input, output, residual, {
			evaluate: (x) => {
				const [y1, r1] = f1.evaluate(x);
				const y2 = f2.evaluate(x);
				return [[y1, y2], r1];
			},
			forward: (x, dx, [[y1, y2], r1]) => {
				const [dy1, dr1] = f1.output.project(null, f1.forward(x, dx, [y1, r1]));
				const dy2 = f2.forward(x, dx, y2);
				return [[dy1, dy2], dr1];
			},
		});
	};

export const forkRR =
	<C extends $A>(input: C) =>
	<A extends $A, B extends $A, R2 extends $A>(
		f1: IFA<C, A> | IF1<C, A>,
		f2: IFR<C, B, R2>,
	): IFR<C, APair<A, B>, R2> => {
		const output = pair(f1.output, f2.output.shape[0]);
		const residual = f2.output.shape[1];
		return makeIFR(input, output, residual, {
			evaluate: (x) => {
				const y1 = f1.evaluate(x);
				const [y2, r2] = f2.evaluate(x);
				return [[y1, y2], r2];
			},
			forward: (x, dx, [[y1, y2], r2]) => {
				const dy1 = f1.forward(x, dx, y1);
				const [dy2, dr2] = f2.output.project(null, f2.forward(x, dx, [y2, r2]));
				return [[dy1, dy2], dr2];
			},
		});
	};

export const forkR2 =
	<C extends $A>(input: C) =>
	<A extends $A, B extends $A, R1 extends $A, R2 extends $A>(
		f1: IFR<C, A, R1>,
		f2: IFR<C, B, R2>,
	): IFR<C, APair<A, B>, APair<R1, R2>> => {
		const output = pair(f1.output.shape[0], f2.output.shape[0]);
		const residual = pair(f1.output.shape[1], f2.output.shape[1]);
		return makeIFR(input, output, residual, {
			evaluate: (x) => {
				const [y1, r1] = f1.evaluate(x);
				const [y2, r2] = f2.evaluate(x);
				return [
					[y1, y2],
					[r1, r2],
				];
			},
			forward: (x, dx, [[y1, y2], [r1, r2]]) => {
				const [dy1, dr1] = f1.output.project(null, f1.forward(x, dx, [y1, r1]));
				const [dy2, dr2] = f2.output.project(null, f2.forward(x, dx, [y2, r2]));
				return [
					[dy1, dy2],
					[dr1, dr2],
				];
			},
		});
	};

export const fork =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A>(
		f1: IF<C, A>,
		f2: IF<C, B>,
	): IF<C, APair<A, B>> => {
		if (f1.kind === IFKind.IFA && f2.kind === IFKind.IFA) {
			return forkA(c)(f1, f2);
		}
		if (f1.kind === IFKind.IFR) {
			return f2.kind === IFKind.IFR ? forkR2(c)(f1, f2) : forkRL(c)(f1, f2);
		}
		return f2.kind === IFKind.IFR ? forkRR(c)(f1, f2) : fork1(c)(f1, f2);
	};
