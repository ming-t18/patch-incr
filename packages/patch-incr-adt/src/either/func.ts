import { composeA, composeA1, composeWithIsoA, FUnion } from "@/funcs";
import { makeIFA, REEVAL } from "@/funcs/helpers";
import { FMapValue } from "@/funcs/map";
import type { $A, $T } from "@/types/abbr";
import type { Evaluate, IF1, IFA } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";
import { UnionCaseError } from "@/union";
import { type AZero, zeroType } from "@/unit";
import { type AEither, dLeft, dRight, either, matchDEither } from ".";

export * from "./choice";

export class FEither<A extends $A, B extends $A> {
	constructor(
		readonly either: AEither<A, B>,
		readonly fUnion = new FUnion(either),
		readonly fLeft = new FMapValue(either.shape.left),
		readonly fRight = new FMapValue(either.shape.right),
	) {}

	introCond<C extends $A>(
		isRight: (input: $T<C>) => boolean,
		funcs: { left: IF1<C, A>; right: IF1<C, B> },
	): IF1<C, AEither<A, B>> {
		const left = composeWithIsoA(funcs.left, this.fLeft.iso());
		const right = composeWithIsoA(funcs.right, this.fRight.iso());
		return this.fUnion.introCond((x) => (isRight(x) ? "right" : "left"), {
			left,
			right,
		});
	}

	introCondA<C extends $A>(
		isRight: (input: $T<C>) => boolean,
		funcs: { left: IFA<C, A>; right: IFA<C, B> },
	): IFA<C, AEither<A, B>> {
		return this.fUnion.introCondA((x) => (isRight(x) ? "right" : "left"), {
			left: composeA(funcs.left, this.fLeft.intro()),
			right: composeA(funcs.right, this.fRight.intro()),
		});
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
}

// Algebraic rules

export const flip = <A extends $A, B extends $A>(
	eab: AEither<A, B>,
): AEither<B, A> => either(eab.shape.right.inner, eab.shape.left.inner);

// Introduction rules

export const introLeft = <A extends $A, B extends $A>(
	either: AEither<A, B>,
): IFA<A, AEither<A, B>> => {
	const fe = new FEither(either);
	return composeA(fe.fLeft.intro(), fe.fUnion.introCase("left"));
};

export const introRight = <A extends $A, B extends $A>(
	either: AEither<A, B>,
): IFA<B, AEither<A, B>> => {
	const fe = new FEither(either);
	return composeA(fe.fRight.intro(), fe.fUnion.introCase("right"));
};

export const comm = <A extends $A, B extends $A>(
	either: AEither<A, B>,
): IFA<AEither<A, B>, AEither<B, A>> => {
	return makeIFA(either, flip(either), {
		evaluate: (e) => ("left" in e ? { right: e.left } : { left: e.right }),
		forward: (_x, dx) =>
			dx.type === "left" ? dRight(dx.change) : dLeft(dx.change),
	});
};

export const commIso = <A extends $A, B extends $A>(
	either: AEither<A, B>,
): IIsoA<AEither<A, B>, AEither<B, A>> => ({
	fwd: comm(either),
	inv: comm(flip(either)),
});

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
