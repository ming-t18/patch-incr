import { composeA, composeFromA, FUnion } from "@/funcs";
import { makeIFA, REEVAL } from "@/funcs/helpers";
import { FMapValue } from "@/funcs/map";
import type { $A } from "@/types/abbr";
import type { Evaluate, IF, IFA } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";
import { UnionCaseError } from "@/union";
import { type AZero, zeroType } from "@/unit";
import { type AEither, dLeft, dRight, either, matchDEither } from ".";

export class FEither<A extends $A, B extends $A> {
	constructor(
		readonly either: AEither<A, B>,
		readonly fUnion = new FUnion(either),
		readonly fLeft = new FMapValue(either.shape.left),
		readonly fRight = new FMapValue(either.shape.right),
	) {}

	// Introduction rules
	left(): IFA<A, AEither<A, B>> {
		return composeA(this.fLeft.intro(), this.fUnion.introCase("left"));
	}

	right(): IFA<B, AEither<A, B>> {
		return composeA(this.fRight.intro(), this.fUnion.introCase("right"));
	}

	elim<C extends $A>(left: IF<A, C>, right: IF<B, C>): IF<AEither<A, B>, C> {
		return this.fUnion.elim(left.output, {
			left: composeFromA(this.fLeft.elim(), left),
			right: composeFromA(this.fRight.elim(), right),
		});
	}

	elimA<C extends $A>(
		left: IFA<A, C>,
		right: IFA<B, C>,
	): IFA<AEither<A, B>, C> {
		return this.fUnion.elimA(left.output, {
			left: composeA(this.fLeft.elim(), left),
			right: composeA(this.fRight.elim(), right),
		});
	}
}

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
			const dxm = matchDEither(dx);
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
			const dxm = matchDEither(dx);
			if (dxm === null) {
				return REEVAL;
			}
			if ("left" in dxm) {
				const dxlm = matchDEither(dxm.left);
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
			const dxm = matchDEither(dx);
			if (dxm === null) {
				return REEVAL;
			}
			if ("left" in dxm) {
				return dLeft(dLeft(dxm.left));
			}
			if ("right" in dxm) {
				const dxrm = matchDEither(dxm.right);
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
