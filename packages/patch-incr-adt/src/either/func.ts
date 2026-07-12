import { composeA, composeA1, FUnion } from "@/funcs";
import { makeIFA, REEVAL } from "@/funcs/helpers";
import { FMapValue } from "@/funcs/map";
import type { $A } from "@/types/abbr";
import type { Evaluate, IF1, IFA } from "@/types/func";
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

	flipped(): AEither<B, A> {
		return either(this.either.shape.right.inner, this.either.shape.left.inner);
	}

	// Introduction rules
	left(): IFA<A, AEither<A, B>> {
		return composeA(this.fLeft.intro(), this.fUnion.introCase("left"));
	}

	right(): IFA<B, AEither<A, B>> {
		return composeA(this.fRight.intro(), this.fUnion.introCase("right"));
	}

	elim<C extends $A>(left: IF1<A, C>, right: IF1<B, C>): IF1<AEither<A, B>, C> {
		return this.fUnion.elim(left.output, {
			left: composeA1(this.fLeft.elim(), left),
			right: composeA1(this.fRight.elim(), right),
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

	comm0(): IFA<AEither<A, B>, AEither<B, A>> {
		return makeIFA(this.either, this.flipped(), {
			evaluate: (e) => ("left" in e ? { right: e.left } : { left: e.right }),
			forward: (_x, dx) =>
				dx.type === "left" ? dRight(dx.change) : dLeft(dx.change),
		});
	}

	comm(): IIsoA<AEither<A, B>, AEither<B, A>> {
		return {
			fwd: this.comm0(),
			inv: new FEither(this.flipped()).comm0(),
		};
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
				? { left: e.left.left }
				: { right: { left: e.left.right } }
			: { right: { right: e.right } };
	return makeIFA(input, output, {
		evaluate,
		forward: (_x, dx) => {
			const dxm = matchDEither<AEither<A, B>, C>(dx);
			if (dxm === null) {
				return REEVAL;
			}
			if ("left" in dxm) {
				const dxlm = matchDEither<A, B>(dxm.left);
				if (dxlm === null) {
					return REEVAL;
				}
				return "left" in dxlm ? dLeft(dxlm.left) : dRight(dLeft(dxlm.right));
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
			? { left: { left: e.left } }
			: "left" in e.right
				? { left: { right: e.right.left } }
				: { right: e.right.right };
	return makeIFA(input, output, {
		evaluate,
		forward: (_x, dx) => {
			const dxm = matchDEither<A, AEither<B, C>>(dx);
			if (dxm === null) {
				return REEVAL;
			}
			if ("left" in dxm) {
				return dLeft(dLeft(dxm.left));
			}
			if ("right" in dxm) {
				const dxrm = matchDEither<B, C>(dxm.right);
				if (dxrm === null) {
					return REEVAL;
				}
				return "left" in dxrm ? dLeft(dRight(dxrm.left)) : dRight(dxrm.right);
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
