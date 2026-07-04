import { FRecord, FUnion } from "@/funcs";
import { makeIFA, REEVAL } from "@/funcs/helpers";
import type { $A } from "@/types/abbr";
import type { Evaluate, IF, IFA } from "@/types/func";
import type { IIso, IIsoA } from "@/types/func/iso";
import { UnionCaseError } from "@/union";
import { type AZero, zeroType } from "@/unit";
import { type AEither, dLeft, dRight, either, matchDEither } from ".";

// Introduction rules

export const condA = <A extends $A, B extends $A, C extends $A>(
	isRight: (input: A) => boolean,
	fLeft: IFA<A, B>,
	fRight: IFA<A, C>,
): IFA<A, AEither<B, C>> => {
	const input = fLeft.input;
	const output = either(fLeft.output, fRight.output);
	const fUnion = new FUnion(output);
	return fUnion.introCondA((x) => (isRight(x) ? "right" : "left"), {
		left: new FRecord(output.shape.left).introA(input, { left: fLeft }),
		right: new FRecord(output.shape.right).introA(input, { right: fRight }),
	});
};

export const cond = <A extends $A, B extends $A, C extends $A>(
	isRight: (input: A) => boolean,
	fLeft: IF<A, B>,
	fRight: IF<A, C>,
): IF<A, AEither<B, C>> => {
	const input = fLeft.input;
	const output = either(fLeft.output, fRight.output);
	const fUnion = new FUnion(output);
	return fUnion.introCond((x) => (isRight(x) ? "right" : "left"), {
		// @ts-expect-error TODO fix
		left: new FRecord(output.shape.left).intro(input, { left: fLeft }),
		// @ts-expect-error TODO fix
		right: new FRecord(output.shape.right).intro(input, { right: fRight }),
	});
};

declare const left: <A extends $A, B extends $A>(
	either: AEither<A, B>,
) => IFA<A, AEither<A, B>>;

declare const right: <A extends $A, B extends $A>(
	either: AEither<A, B>,
) => IFA<A, AEither<A, B>>;

// Elimination rules

declare const elim: <A extends $A, B extends $A, C extends $A>(
	either: AEither<A, B>,
	left: IF<A, C>,
	right: IF<B, C>,
) => IIso<AEither<A, B>, C>;

// Algebraic rules

export const introZeroLeft = <A extends $A>(
	right: A,
): IFA<A, AEither<AZero, A>> =>
	makeIFA(right, either(zeroType, right), {
		evaluate: (right) => ({ right }),
		forward: (_x, dx) => {
			return dRight(dx);
		},
	});

export const elimZeroLeft = <A extends $A>(
	right: A,
): IFA<AEither<AZero, A>, A> => {
	const input = either(zeroType, right);
	return makeIFA(input, right, {
		evaluate: (e) => {
			if ("left" in e) {
				throw new UnionCaseError("right", "left");
			}
			return e.right;
		},
		forward: (_x, dx) => {
			const dxm = matchDEither(input, dx);
			if (dxm === null || "left" in dxm) {
				return REEVAL;
			}
			return dx.change;
		},
	});
};

export const zeroRight = <A extends $A>(
	right: A,
): IIsoA<A, AEither<AZero, A>> => ({
	fwd: introZeroLeft(right),
	inv: elimZeroLeft(right),
});

// TODO declare const zeroRight: <A extends $A>(left: A) => IIosA<A, AEither<A, AZero>>;

export const comm0 = <A extends $A, B extends $A>(
	a: A,
	b: B,
): IFA<AEither<A, B>, AEither<B, A>> =>
	makeIFA(either(a, b), either(b, a), {
		evaluate: (e) => ("left" in e ? { right: e.left } : { left: e.right }),
		forward: (_x, dx) =>
			dx.type === "left" ? dRight(dx.change) : dLeft(dx.change),
	});

export const comm = <A extends $A, B extends $A>(
	a: A,
	b: B,
): IIsoA<AEither<A, B>, AEither<B, A>> => ({
	fwd: comm0(a, b),
	inv: comm0(b, a),
});

export const assocLR = <A extends $A, B extends $A, C extends $A>(
	a: A,
	b: B,
	c: C,
): IFA<AEither<AEither<A, B>, C>, AEither<A, AEither<B, C>>> => {
	const eab = either(a, b);
	const ebc = either(b, c);
	const input = either(eab, c);
	const output = either(a, ebc);

	const evaluate: Evaluate<typeof input, typeof output> = (e) =>
		"left" in e
			? "left" in e.left
				? { left: e }
				: { right: { left: e } }
			: { right: { right: e } };
	return makeIFA(input, output, {
		evaluate,
		forward: (_x, dx) => {
			const dxm = matchDEither(input, dx);
			if (dxm === null) {
				return REEVAL;
			}
			if ("left" in dxm) {
				const dxlm = matchDEither(input, dxm.left);
				if (dxlm === null) {
					return REEVAL;
				}
			} else if ("right" in dxm) {
				return dRight(dRight(dxm.right));
			}
			return REEVAL;
		},
	});
};

export const assocRL = <A extends $A, B extends $A, C extends $A>(
	a: A,
	b: B,
	c: C,
): IFA<AEither<A, AEither<B, C>>, AEither<AEither<A, B>, C>> => {
	const eab = either(a, b);
	const ebc = either(b, c);
	const input = either(a, ebc);
	const output = either(eab, c);

	const evaluate: Evaluate<typeof input, typeof output> = (e) =>
		"left" in e
			? { left: { left: e } }
			: "left" in e.right
				? { left: { right: e.right.left } }
				: { right: e.right.right };
	return makeIFA(input, output, {
		evaluate,
		forward: (_x, dx) => {
			const dxm = matchDEither(input, dx);
			if (dxm === null) {
				return REEVAL;
			}
			if ("left" in dxm) {
				return dLeft(dLeft(dxm.left));
			}
			if ("right" in dxm) {
				const dxrm = matchDEither(input, dxm.right);
				if (dxrm === null) {
					return REEVAL;
				}
				return "left" in dxrm ? dRight(dLeft(dxrm.left)) : dRight(dxrm.right);
			}

			return REEVAL;
		},
	});
};

export const assoc = <A extends $A, B extends $A, C extends $A>(
	a: A,
	b: B,
	c: C,
): IIsoA<AEither<AEither<A, B>, C>, AEither<A, AEither<B, C>>> => ({
	fwd: assocLR(a, b, c),
	inv: assocRL(a, b, c),
});
