import { makeIF1, makeIFA, makeIFR, REEVAL } from "@/funcs/helpers";
import { isReplaceOnly } from "@/replaceOnly";
import type { $A } from "@/types/abbr";
import { type IF, type IF1, type IFA, IFKind, type IFR } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";
import type { AUnit, AZero } from "@/unit";

import { type APair, flip, pair } from "./pair";

export { first, firstSecond, second } from "./firstSecond";
export { fork } from "./fork";
export { type APair, type DPair, flip, type Pair, pair } from "./pair";

// Introduction rules

// region intro
export const introA =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A>(
		f1: IFA<C, A>,
		f2: IFA<C, B>,
		output: APair<A, B> = pair(f1.output, f2.output),
	): IFA<C, APair<A, B>> =>
		makeIFA(c, output, {
			evaluate: (x) => [f1.evaluate(x), f2.evaluate(x)],
			forward: (x, dx) => [f1.forward(x, dx), f2.forward(x, dx)],
		});

export const intro1 =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A>(
		f1: IFA<C, A> | IF1<C, A>,
		f2: IFA<C, B> | IF1<C, B>,
		output: APair<A, B> = pair(f1.output, f2.output),
	): IF1<C, APair<A, B>> =>
		makeIF1(c, output, {
			evaluate: (x) => [f1.evaluate(x), f2.evaluate(x)],
			forward: (x, dx, [y1, y2]) => [
				f1.forward(x, dx, y1),
				f2.forward(x, dx, y2),
			],
		});

export const introRL =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A, RA extends $A>(
		f1: IFR<C, A, RA>,
		f2: IFA<C, B> | IF1<C, B>,
		output: APair<A, B> = pair(f1.output.shape[0], f2.output),
	): IFR<C, APair<A, B>, RA> =>
		makeIFR(c, output, f1.output.shape[1], {
			evaluate: (x) => {
				const [y1, r1] = f1.evaluate(x);
				return [[y1, f2.evaluate(x)], r1];
			},
			forward: (x, dx, [[y1, y2], r1]) => [
				f1.forward(x, dx, [y1, r1]),
				f2.forward(x, dx, y2),
			],
		});

export const introRR =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A, RB extends $A>(
		f1: IFA<C, A> | IF1<C, A>,
		f2: IFR<C, B, RB>,
		output: APair<A, B> = pair(f1.output, f2.output.shape[0]),
	): IFR<C, APair<A, B>, RB> =>
		makeIFR(c, output, f2.output.shape[1], {
			evaluate: (x) => {
				const y1 = f1.evaluate(x);
				const [y2, r2] = f2.evaluate(x);
				return [[y1, y2], r2];
			},
			forward: (x, dx, [[y1, y2], r2]) => [
				f1.forward(x, dx, y1),
				f2.forward(x, dx, [y2, r2]),
			],
		});

export const introR2 =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A, RA extends $A, RB extends $A>(
		f1: IFR<C, A, RA>,
		f2: IFR<C, B, RB>,
		output: APair<A, B> = pair(f1.output.shape[0], f2.output.shape[0]),
	): IFR<C, APair<A, B>, APair<RA, RB>> =>
		makeIFR(c, output, pair(f1.output.shape[1], f2.output.shape[1]), {
			evaluate: (x) => {
				const [y1, r1] = f1.evaluate(x);
				const [y2, r2] = f2.evaluate(x);
				return [
					[y1, y2],
					[r1, r2],
				];
			},
			forward: (x, dx, [[y1, y2], [r1, r2]]) => [
				f1.forward(x, dx, [y1, r1]),
				f2.forward(x, dx, [y2, r2]),
			],
		});

// endregion

export const intro =
	<C extends $A>(c: C) =>
	<A extends $A, B extends $A>(
		f1: IF<C, A>,
		f2: IF<C, B>,
	): IF<C, APair<A, B>> => {
		if (f1.kind === IFKind.IFR || f2.kind === IFKind.IFR) {
			if (f1.kind === IFKind.IFR) {
				return f2.kind === IFKind.IFR ? introR2(c)(f1, f2) : introRL(c)(f1, f2);
			}
			if (f2.kind === IFKind.IFR) {
				return introRR(c)(f1, f2);
			}
		}
		if (f1.kind === IFKind.IFA && f2.kind === IFKind.IFA) {
			return introA(c)(f1, f2);
		}
		return intro1(c)(f1, f2);
	};

// Elimination rules
export const fst = <A extends $A, B extends $A>(
	pair: APair<A, B>,
): IFA<APair<A, B>, A> =>
	makeIFA(pair, pair.shape[0], {
		evaluate: ([a, _]) => a,
		forward: (_p, [da, _db]) => da,
	});

export const snd = <A extends $A, B extends $A>(
	pair: APair<A, B>,
): IFA<APair<A, B>, B> =>
	makeIFA(pair, pair.shape[1], {
		evaluate: ([_, b]) => b,
		forward: (_p, [_da, db]) => db,
	});

// Arrow rules

// Algebraic rules

declare const zeroL: <A extends $A>(a: A) => IIsoA<A, APair<AZero, A>>;
declare const zeroR: <A extends $A>(a: A) => IIsoA<A, APair<A, AZero>>;
declare const unitL: <A extends $A>(a: A) => IIsoA<A, APair<AUnit, A>>;
declare const unitR: <A extends $A>(a: A) => IIsoA<A, APair<A, AUnit>>;

export const comm = <A extends $A, B extends $A>(
	pair: APair<A, B>,
): IFA<APair<A, B>, APair<B, A>> =>
	makeIFA(pair, flip(pair), {
		evaluate: ([a, b]) => [b, a],
		forward: (_p, [da, db]) => [db, da],
	});

export const commIso = <A extends $A, B extends $A>(
	pair: APair<A, B>,
): IIsoA<APair<A, B>, APair<B, A>> => ({
	fwd: comm(pair),
	inv: comm(flip(pair)),
});

export const assocLR = <A extends $A, B extends $A, C extends $A>(
	input: APair<APair<A, B>, C>,
): IFA<APair<APair<A, B>, C>, APair<A, APair<B, C>>> => {
	const {
		shape: [
			{
				shape: [a, b],
			},
			c,
		],
	} = input;
	return makeIFA(input, pair(a, pair(b, c)), {
		evaluate: ([[x, y], z]) => [x, [y, z]],
		forward: (_, [dxy, dz]) => {
			if (isReplaceOnly(dxy)) {
				return REEVAL;
			}
			const [dx, dy] = input.shape[0].project(null, dxy);
			return b.isEmpty(dy) && c.isEmpty(dz) ? [dx, null] : [dx, [dy, dz]];
		},
	});
};

export const assocRL = <A extends $A, B extends $A, C extends $A>(
	input: APair<A, APair<B, C>>,
): IFA<APair<A, APair<B, C>>, APair<APair<A, B>, C>> => {
	const {
		shape: [
			a,
			{
				shape: [b, c],
			},
		],
	} = input;
	return makeIFA(input, pair(pair(a, b), c), {
		evaluate: ([x, [y, z]]) => [[x, y], z],
		forward: (_, [dx, dyz]) => {
			const [dy, dz] = input.shape[1].project(null, dyz);
			return a.isEmpty(dx) && b.isEmpty(dy) ? [null, dz] : [[dx, dy], dz];
		},
	});
};

export const assocIso = <A extends $A, B extends $A, C extends $A>(
	input: APair<APair<A, B>, C>,
): IIsoA<APair<APair<A, B>, C>, APair<A, APair<B, C>>> => ({
	fwd: assocLR(input),
	inv: assocRL(
		pair(
			input.shape[0].shape[0],
			pair(input.shape[0].shape[1], input.shape[1]),
		),
	),
});

// Associative properties

export const distrFst = <A extends $A, B extends $A, C extends $A>(
	input: APair<APair<A, B>, C>,
): IFA<APair<APair<A, B>, C>, APair<APair<A, C>, B>> => {
	const a: A = input.shape[0].shape[0];
	const b: B = input.shape[0].shape[1];
	const c: C = input.shape[1];
	const pac: APair<A, C> = pair(a, c);
	return makeIFA(input, pair(pac, b), {
		evaluate: ([[a, b], c]) => [[a, c], b],
		forward: (_p, [dab, dc]) => {
			const [da, db] = input.project(null, dab);
			return [a.isEmpty(da) && c.isEmpty(dc) ? null : [da, dc], db];
		},
	});
};

export const undistrFst = <A extends $A, B extends $A, C extends $A>(
	input: APair<APair<A, C>, B>,
): IFA<APair<APair<A, C>, B>, APair<APair<A, B>, C>> => {
	const a: A = input.shape[0].shape[0];
	const b: B = input.shape[1];
	const c: C = input.shape[0].shape[1];
	const pab: APair<A, B> = pair(a, b);
	const pac: APair<A, C> = pair(a, c);
	return makeIFA(input, pair(pab, c), {
		evaluate: ([[a, c], b]) => [[a, b], c],
		forward: (_p, [dac, db]) => {
			const [da, dc] = pac.project(null, dac);
			return [a.isEmpty(da) && b.isEmpty(db) ? null : [da, db], dc];
		},
	});
};

export const distrSnd = <A extends $A, B extends $A, C extends $A>(
	input: APair<APair<A, B>, C>,
): IFA<APair<APair<A, B>, C>, APair<A, APair<B, C>>> => {
	const [
		{
			shape: [a, b],
		},
		c,
	] = input.shape;
	const pbc: APair<B, C> = pair(b, c);
	return makeIFA(input, pair(a, pbc), {
		evaluate: ([[a, b], c]) => [a, [b, c]],
		forward: (_p, [dab, dc]) => {
			const [da, db] = input.project(null, dab);
			return [da, b.isEmpty(db) && c.isEmpty(dc) ? null : [db, dc]];
		},
	});
};

export const undistrSnd = <A extends $A, B extends $A, C extends $A>(
	input: APair<A, APair<B, C>>,
): IFA<APair<A, APair<B, C>>, APair<APair<A, B>, C>> => {
	const {
		shape: [
			a,
			{
				shape: [b, c],
			},
		],
	} = input;
	const pab = pair(a, b);
	const pbc = pair(b, c);
	return makeIFA(input, pair(pab, c), {
		evaluate: ([a, [b, c]]) => [[a, b], c],
		forward: (_p, [da, dbc]) => {
			const [db, dc] = pbc.project(null, dbc);
			return [a.isEmpty(da) && b.isEmpty(db) ? null : [da, db], dc];
		},
	});
};
