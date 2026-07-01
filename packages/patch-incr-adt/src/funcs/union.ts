import {
	type AEither,
	type DeriveEitherShapedChange,
	dLeft,
	dRight,
	either,
	isLeft,
} from "@/either";
import type { $A, $D, $T } from "@/types/abbr";
import type { Evaluate, IF, IFA } from "@/types/func";
import {
	type AUnion,
	type DeriveUnionShapedChange,
	type DeriveUnionValue,
	UnionCaseError,
	type UnionChangeEntry,
} from "@/union";
import { type AUnionOmit, type AUnionPick, omit } from "@/union/utils";
import { makeForward, makeForwardA } from "./helpers";

export class FUnion<
	Shape extends Record<Key, $A>,
	Key extends keyof Shape = keyof Shape,
> {
	constructor(readonly union: AUnion<Shape, Key>) {}

	/** Conditional branching: `x => funcs[getCase(x)](x)` */
	introCond<A extends $A>(
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

	/** Create from a case: `x => x as Union`. Also the `review` for prisms. */
	introCase<K extends Key>(disc: K): IFA<Shape[K], AUnion<Shape, Key>> {
		const input = this.union.shape[disc];
		const evaluate: Evaluate<Shape[K], AUnion<Shape, Key>> = (x) => x;
		return {
			evaluate,
			forward: makeForwardA<Shape[K], AUnion<Shape, Key>>(input, this.union, {
				evaluate,
				forward: (_x, dx: $D<Shape[K]>): $D<AUnion<Shape, Key>> => {
					return {
						// @ts-expect-error Type inference failed to derive internal changes
						type: disc,
						change: dx,
					};
				},
			}),
			input,
			output: this.union,
		};
	}

	/** Performs pattern matching on the union: `x => funcs[union.getDiscrimant(x)](x)` */
	elim<B extends $A>(
		output: B,
		funcs: { [key1 in Key]: IF<Shape[key1], B> },
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

	/** Performs pattern matching on the union: `x => funcs[union.getDiscrimant(x)](x)` */
	elimA<B extends $A>(
		output: B,
		funcs: { [key1 in Key]: IFA<Shape[key1], B> },
	): IFA<AUnion<Shape, Key>, B> {
		type Input = DeriveUnionValue<Shape, Key>;
		const evaluate = (input: Input): $T<B> => {
			const disc = this.union.getDiscrimant(input);
			return funcs[disc].evaluate(input);
		};

		return {
			evaluate,
			forward: makeForwardA(this.union, output, {
				evaluate,
				forward: (x, dx): $D<B> => {
					const disc = this.union.getDiscrimant(x);
					const x1 = this.union.apply(x, dx);
					const disc1 = this.union.getDiscrimant(x1);
					if (disc === disc1) {
						return funcs[disc].forward(
							x,
							(dx as UnionChangeEntry<Key, $D<Shape[Key]>>).change,
						);
					}

					return output.fromReplace(evaluate(x1));
				},
			}),
			input: this.union,
			output,
		};
	}

	/** Splits up `r -> (r[k] + r without k)` */
	focus<K extends Key>(
		key: K,
	): IFA<AUnion<Shape, Key>, AEither<Shape[K], AUnionOmit<Shape, Key, K>>> {
		const { shape, getDiscrimant } = this.union;
		const omitted: AUnionOmit<Shape, Key, K> = omit(this.union, key) as never;
		const output = either(shape[key] as Shape[K], omitted);
		const evaluate: Evaluate<
			AUnion<Shape, Key>,
			AEither<Shape[K], AUnionOmit<Shape, Key, K>>
		> = (x) => (getDiscrimant(x) === key ? { left: x } : { right: x });
		return {
			evaluate,
			forward: makeForwardA(this.union, output, {
				evaluate,
				forward: (
					x,
					dx: DeriveUnionShapedChange<Shape, Key>,
				): $D<typeof output> => {
					const disc0 = getDiscrimant(x);
					if (disc0 !== dx.type) {
						throw new UnionCaseError(disc0, dx.type);
					}

					if (disc0 === key) {
						return dLeft(dx.change);
					}
					return dRight(dx as $D<typeof omitted>);
				},
			}),
			input: this.union,
			output,
		};
	}

	/** Inverse of focus, `r -> (r[k] + r without k)` */
	unfocus<K extends Key>(
		key: K,
	): IFA<AEither<Shape[K], AUnionOmit<Shape, Key, K>>, AUnion<Shape, Key>> {
		const { shape } = this.union;
		const omitted: AUnionOmit<Shape, Key, K> = omit(this.union, key) as never;
		const input = either(shape[key] as Shape[K], omitted);
		const evaluate: Evaluate<
			AEither<Shape[K], AUnionOmit<Shape, Key, K>>,
			AUnion<Shape, Key>
		> = (e) => (isLeft(e) ? { left: e } : { right: e });
		return {
			evaluate,
			forward: makeForwardA(input, this.union, {
				evaluate,
				forward: (
					x,
					dx: DeriveEitherShapedChange<Shape[K], typeof omitted>,
				): $D<typeof this.union> => {
					const side = isLeft(x) ? "left" : "right";
					if (dx.type !== side) {
						throw new UnionCaseError(side, dx.type);
					}

					if (side === "left") {
						return {
							type: key as K,
							change: dx.change,
						} as UnionChangeEntry<K, $D<Shape[K]>>;
					}
					return dx.change as never;
				},
			}),
			input,
			output: this.union,
		};
	}

	/** Splits up `r -> (r[keys] + r[~keys])` */
	partition<
		APart extends AUnion<Shape1, K>,
		Shape1 extends Record<K, $A>,
		K extends Key,
	>(
		_aPart: APart,
	): IFA<
		AUnion<Shape, Key>,
		AEither<AUnionPick<Shape, Key, K>, AUnionOmit<Shape, Key, K>>
	> {
		throw new Error("TODO");
	}

	/** Inverse of partition. `(r[keys] + r[~keys]) -> r` */
	merge<
		APicked extends AUnion<ShapePicked, KPicked>,
		ShapePicked extends Record<KPicked, $A>,
		KPicked extends Key,
	>(
		_aPick: APicked,
	): IFA<
		AEither<APicked, AUnionOmit<Shape, Key, KPicked>>,
		AUnion<Shape, Key>
	> {
		throw new Error("TODO");
	}
}
