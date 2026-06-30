import type { $A, $D, $T } from "@/types/abbr";
import type { IF } from "@/types/func";
import type { AUnion, DeriveUnionValue, UnionChangeEntry } from "@/union";
import { makeForward } from "./helpers";

export class FUnion<
	Shape extends Record<Key, $A>,
	Key extends keyof Shape = keyof Shape,
> {
	constructor(readonly union: AUnion<Shape, Key>) {}
	intro<A extends $A>(
		getCase: (input: A) => Key,
		funcs: { [key in Key]: IF<A, Shape[Key]> },
	): IF<A, AUnion<Shape, Key>> {
		const input: A = funcs[this.union.keys[0] as Key].input;
		type Out = DeriveUnionValue<Shape, Key>;
		const evaluate = (x: $T<A>): Out => {
			const disc = getCase(x);
			return funcs[disc].evaluate(x);
		};
		return {
			evaluate,
			forward: makeForward<A, AUnion<Shape, Key>>(input, this.union, {
				evaluate,
				forward: (x, dx, y): $D<AUnion<Shape, Key>> => {
					const x1 = input.apply(x, dx);
					const disc = getCase(x);
					const disc1 = getCase(x1);
					if (disc === disc1) {
						return this.union.fromChangeCase(
							disc,
							funcs[disc].forward(x, dx, y),
						);
					}

					return this.union.fromReplace(evaluate(x1));
				},
			}),
			input,
			output: this.union,
		};
	}

	elim<B extends $A>(
		output: B,
		funcs: { [key in Key]: IF<Shape[Key], B> },
	): IF<AUnion<Shape, Key>, B> {
		type Input = DeriveUnionValue<Shape, Key>;
		const evaluate = (input: Input): $T<B> => {
			const disc = this.union.getDiscrimant(input);
			return funcs[disc].evaluate(input);
		};

		return {
			evaluate,
			forward: makeForward(this.union, output, {
				evaluate,
				forward: (x, dx, y): $D<B> => {
					const disc = this.union.getDiscrimant(x);
					const x1 = this.union.apply(x, dx);
					const disc1 = this.union.getDiscrimant(x1);
					if (disc === disc1) {
						return funcs[disc].forward(
							x,
							// is non-empty and non-replace
							(dx as UnionChangeEntry<Key, $D<Shape[Key]>>).change,
							y,
						);
					}

					return output.fromReplace(evaluate(x1));
				},
			}),
			input: this.union,
			output,
		};
	}
}
