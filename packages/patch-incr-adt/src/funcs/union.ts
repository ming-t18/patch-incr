import {
	type AEither,
	type DeriveEitherShapedChange,
	dLeft,
	dRight,
	either,
	isLeft,
} from "@/either";
import { getReplaceOnly } from "@/replaceOnly";
import type { $A, $D, $T } from "@/types/abbr";
import type { Evaluate, IF, IFA } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";
import {
	type AUnion,
	type DeriveUnionShapedChange,
	type DeriveUnionValue,
	UnionCaseError,
	type UnionChangeEntry,
} from "@/union";
import { type AUnionOmit, type AUnionPick, omit } from "@/union/utils";
import { makeIF, makeIFA, ShapePartition } from "./helpers";

export class FUnion<
	Shape extends Record<Key, $A>,
	Key extends keyof Shape = keyof Shape,
> {
	constructor(readonly union: AUnion<Shape, Key>) {}

	/** Conditional branching: `x => funcs[getCase(x)](x)` */
	introCond<A extends $A>(
		getCase: (input: $T<A>) => Key,
		funcs: { [key in Key]: IF<A, Shape[Key]> },
	): IF<A, AUnion<Shape, Key>> {
		const input: A = funcs[this.union.keys[0] as Key].input;
		type Out = DeriveUnionValue<Shape, Key>;
		const evaluate = (x: $T<A>): Out => {
			const disc = getCase(x);
			return funcs[disc].evaluate(x);
		};
		return makeIF<A, AUnion<Shape, Key>>(input, this.union, {
			evaluate,
			forward: (x, dx, y): $D<AUnion<Shape, Key>> => {
				const x1 = input.apply(x, dx);
				const disc = getCase(x);
				const disc1 = getCase(x1);
				if (disc === disc1) {
					return this.union.fromChangeCase(disc, funcs[disc].forward(x, dx, y));
				}

				return this.union.fromReplace(evaluate(x1));
			},
		});
	}

	/** Conditional branching: `x => funcs[getCase(x)](x)` */
	introCondA<A extends $A>(
		getCase: (input: $T<A>) => Key,
		funcs: { [key in Key]: IFA<A, Shape[Key]> },
	): IFA<A, AUnion<Shape, Key>> {
		const input: A = funcs[this.union.keys[0] as Key].input;
		type Out = DeriveUnionValue<Shape, Key>;
		const evaluate = (x: $T<A>): Out => {
			const disc = getCase(x);
			return funcs[disc].evaluate(x);
		};
		return makeIFA<A, AUnion<Shape, Key>>(input, this.union, {
			evaluate,
			forward: (x, dx): $D<AUnion<Shape, Key>> => {
				const x1 = input.apply(x, dx);
				const disc = getCase(x);
				const disc1 = getCase(x1);
				if (disc === disc1) {
					return this.union.fromChangeCase(disc, funcs[disc].forward(x, dx));
				}

				return this.union.fromReplace(evaluate(x1));
			},
		});
	}

	/** Create from a case: `x => x as Union`. Also the `review` for prisms. */
	introCase<K extends Key>(disc: K): IFA<Shape[K], AUnion<Shape, Key>> {
		const input = this.union.shape[disc];
		const evaluate: Evaluate<Shape[K], AUnion<Shape, Key>> = (x) => x;
		return makeIFA<Shape[K], AUnion<Shape, Key>>(input, this.union, {
			evaluate,
			forward: (_x, dx: $D<Shape[K]>): $D<AUnion<Shape, Key>> => {
				return {
					// @ts-expect-error Type inference failed to derive internal changes
					type: disc,
					change: dx,
				};
			},
		});
	}

	elimCase<K extends Key>(disc: K): IFA<AUnion<Shape, Key>, Shape[K]> {
		const output = this.union.shape[disc];
		const evaluate: Evaluate<AUnion<Shape, Key>, Shape[K]> = (x) => {
			const disc1 = this.union.getDiscrimant(x);
			if (disc1 !== disc) throw new UnionCaseError(disc, disc1);
			return x as never;
		};
		return makeIFA<AUnion<Shape, Key>, Shape[K]>(this.union, output, {
			evaluate,
			forward: (_x, dx): $D<Shape[K]> => {
				if (dx.type !== disc) throw new UnionCaseError(disc, dx.type);
				return dx.change;
			},
		});
	}

	isoCase<K extends Key>(disc: K): IIsoA<Shape[K], AUnion<Shape, Key>> {
		return { fwd: this.introCase(disc), inv: this.elimCase(disc) };
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

		return makeIF(this.union, output, {
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
		});
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

		return makeIFA(this.union, output, {
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
		});
	}

	/** Splits up `r -> (r without k + r[k])` */
	focus<K extends Key>(
		key: K,
	): IFA<AUnion<Shape, Key>, AEither<AUnionOmit<Shape, Key, K>, Shape[K]>> {
		const { shape, getDiscrimant } = this.union;
		const omitted: AUnionOmit<Shape, Key, K> = omit(this.union, key) as never;
		const output = either(omitted, shape[key] as Shape[K]);
		const evaluate: Evaluate<
			AUnion<Shape, Key>,
			AEither<AUnionOmit<Shape, Key, K>, Shape[K]>
		> = (x) => (getDiscrimant(x) === key ? { left: x } : { right: x });
		return makeIFA(this.union, output, {
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
					return dRight(dx.change);
				}
				return dLeft(dx as $D<typeof omitted>);
			},
		});
	}

	/** Inverse of focus, `r -> (r without k + r[k])` */
	unfocus<K extends Key>(
		key: K,
	): IFA<AEither<AUnionOmit<Shape, Key, K>, Shape[K]>, AUnion<Shape, Key>> {
		const { shape } = this.union;
		const omitted: AUnionOmit<Shape, Key, K> = omit(this.union, key) as never;
		const input = either(omitted, shape[key] as Shape[K]);
		const evaluate: Evaluate<
			AEither<AUnionOmit<Shape, Key, K>, Shape[K]>,
			AUnion<Shape, Key>
		> = (e) => (isLeft(e) ? { left: e } : { right: e });
		return makeIFA(input, this.union, {
			evaluate,
			forward: (
				x,
				dx: DeriveEitherShapedChange<Shape[K], typeof omitted>,
			): $D<typeof this.union> => {
				const side = isLeft(x) ? "left" : "right";
				if (dx.type !== side) {
					throw new UnionCaseError(side, dx.type);
				}

				if (side === "right") {
					return {
						type: key as K,
						change: dx.change,
					} as UnionChangeEntry<K, $D<Shape[K]>>;
				}
				return dx.change as never;
			},
		});
	}

	/** Splits up `r -> (r[keys] + r[~keys])` */
	partition<
		APart extends AUnion<Shape1, K>,
		Shape1 extends Record<K, $A>,
		K extends Key,
	>(
		aPart: APart,
	): IFA<
		AUnion<Shape, Key>,
		AEither<AUnionPick<Shape, Key, K>, AUnionOmit<Shape, Key, K>>
	> {
		const { shape, getDiscrimant } = this.union;
		const part = new ShapePartition<Shape, Key, K>(shape, aPart.shape);
		const output = either(
			aPart,
			omit(this.union, part.toPick),
		) as never as AEither<AUnionPick<Shape, Key, K>, AUnionOmit<Shape, Key, K>>;
		const evaluate: Evaluate<AUnion<Shape, Key>, typeof output> = (input) => {
			const disc = getDiscrimant(input);
			if (part.isPicked(disc)) {
				return { left: input };
			}
			return { right: input };
		};
		// Not using IFA due to intra-case change between left/right
		return {
			evaluate,
			forward: (x, dx): $D<typeof output> => {
				if (this.union.isEmpty(dx)) {
					return output.empty;
				}
				const disc = getDiscrimant(x);
				const rep = this.union.isReplace(dx);
				const p1 = part.isPicked(disc);
				if (rep !== null) {
					const x1 = getReplaceOnly(rep);
					const disc1 = getDiscrimant(x1);

					const p2 = part.isPicked(disc1);
					if (p1 !== p2) {
						// inter-side change
						return output.fromReplace(evaluate(x1));
					}
				}

				// intra-side change
				if (p1) {
					return { type: "left", change: dx as never };
				} else {
					return { type: "right", change: dx as never };
				}
			},
			input: this.union,
			output,
		};
	}

	/** Inverse of partition. `(r[keys] + r[~keys]) -> r` */
	merge<
		APicked extends AUnion<ShapePicked, K>,
		ShapePicked extends Record<K, $A>,
		K extends Key,
	>(
		aPart: APicked,
	): IFA<AEither<APicked, AUnionOmit<Shape, Key, K>>, AUnion<Shape, Key>> {
		const { shape } = this.union;
		const part = new ShapePartition<Shape, Key, K>(shape, aPart.shape);
		const input = either(aPart, omit(this.union, part.toPick));
		const evaluate: Evaluate<typeof input, AUnion<Shape, Key>> = (x) => {
			return "left" in x ? x.left : x.right;
		};
		return makeIFA(input, this.union, {
			evaluate,
			forward: (
				_x,
				dx: DeriveEitherShapedChange<APicked, AUnionOmit<Shape, Key, K>>,
			) => {
				return dx.change;
			},
		});
	}
}
