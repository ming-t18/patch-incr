import * as B from "@/funcs/basic";
import { makeIF1, makeIFA, makeIFR } from "@/funcs/helpers";
import type { $A } from "@/types/abbr";
import { type IF, type IF1, type IFA, IFKind, type IFR } from "@/types/func";

import { type APair, pair } from "./pair";

export const firstSecondA =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A, B1 extends $A>(
		f1: IFA<A, A1>,
		f2: IFA<B, B1>,
	): IFA<APair<A, B>, APair<A1, B1>> => {
		const output = pair(f1.output, f2.output);
		return makeIFA(input, output, {
			evaluate: ([x, y]) => [f1.evaluate(x), f2.evaluate(y)],
			forward: ([x, y], [dx, dy]) => [f1.forward(x, dx), f2.forward(y, dy)],
		});
	};

export const firstSecond1 =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A, B1 extends $A>(
		f1: IFA<A, A1> | IF1<A, A1>,
		f2: IFA<B, B1> | IF1<B, B1>,
	): IF1<APair<A, B>, APair<A1, B1>> => {
		const output = pair(f1.output, f2.output);
		return makeIF1(input, output, {
			evaluate: ([x, y]) => [f1.evaluate(x), f2.evaluate(y)],
			forward: ([x, y], [dx, dy], [z, w]) => [
				f1.forward(x, dx, z),
				f2.forward(y, dy, w),
			],
		});
	};

export const firstSecondRL =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A, B1 extends $A, R1 extends $A>(
		f1: IFR<A, A1, R1>,
		f2: IFA<B, B1> | IF1<B, B1>,
	): IFR<APair<A, B>, APair<A1, B1>, R1> => {
		const output = pair(f1.output.shape[0], f2.output);
		const residual = f1.output.shape[1];
		return makeIFR(input, output, residual, {
			evaluate: ([x, y]) => {
				const [z, r1] = f1.evaluate(x);
				const w = f2.evaluate(y);
				return [[z, w], r1];
			},
			forward: ([x, y], dxy, [[z, w], r1]) => {
				const [dx, dy] = input.project(null, dxy);
				const [dz, dr1] = f1.output.project(null, f1.forward(x, dx, [z, r1]));
				const dw = f2.forward(y, dy, w);
				return [[dz, dw], dr1];
			},
		});
	};

export const firstSecondRR =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A, B1 extends $A, R2 extends $A>(
		f1: IFA<A, A1> | IF1<A, A1>,
		f2: IFR<B, B1, R2>,
	): IFR<APair<A, B>, APair<A1, B1>, R2> => {
		const output = pair(f1.output, f2.output.shape[0]);
		const residual = f2.output.shape[1];
		return makeIFR(input, output, residual, {
			evaluate: ([x, y]) => {
				const z = f1.evaluate(x);
				const [w, r2] = f2.evaluate(y);
				return [[z, w], r2];
			},
			forward: ([x, y], dxy, [[z, w], r2]) => {
				const [dx, dy] = input.project(null, dxy);
				const dz = f1.forward(x, dx, z);
				const [dw, dr2] = f2.output.project(null, f2.forward(y, dy, [w, r2]));
				return [[dz, dw], dr2];
			},
		});
	};

export const firstSecondR2 =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A, B1 extends $A, R1 extends $A, R2 extends $A>(
		f1: IFR<A, A1, R1>,
		f2: IFR<B, B1, R2>,
	): IFR<APair<A, B>, APair<A1, B1>, APair<R1, R2>> => {
		const output = pair(f1.output.shape[0], f2.output.shape[0]);
		const residual = pair(f1.output.shape[1], f2.output.shape[1]);
		return makeIFR(input, output, residual, {
			evaluate: ([x, y]) => {
				const [z, r1] = f1.evaluate(x);
				const [w, r2] = f2.evaluate(y);
				return [
					[z, w],
					[r1, r2],
				];
			},
			forward: ([x, y], dxy, [[z, w], [r1, r2]]) => {
				const [dx, dy] = input.project(null, dxy);
				const [dz, dr1] = f1.output.project(null, f1.forward(x, dx, [z, r1]));
				const [dw, dr2] = f2.output.project(null, f2.forward(y, dy, [w, r2]));
				return [
					[dz, dw],
					[dr1, dr2],
				];
			},
		});
	};

export const firstSecond =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A, B1 extends $A>(
		f1: IF<A, A1>,
		f2: IF<B, B1>,
	): IF<APair<A, B>, APair<A1, B1>> => {
		if (f1.kind === IFKind.IFA && f2.kind === IFKind.IFA) {
			return firstSecondA(input)(f1, f2);
		}
		if (f1.kind === IFKind.IFR) {
			return f2.kind === IFKind.IFR
				? firstSecondR2(input)(f1, f2)
				: firstSecondRL(input)(f1, f2);
		}
		return f2.kind === IFKind.IFR
			? firstSecondRR(input)(f1, f2)
			: firstSecond1(input)(f1, f2);
	};

export const first =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<A1 extends $A>(f1: IF<A, A1>): IF<APair<A, B>, APair<A1, B>> =>
		firstSecond(input)(f1, B.identity(input.shape[1]));

export const second =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<B1 extends $A>(f2: IF<B, B1>): IF<APair<A, B>, APair<A, B1>> =>
		firstSecond(input)(B.identity(input.shape[0]), f2);
