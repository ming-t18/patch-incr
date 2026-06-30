import type { APair } from "@/pair";
import type { $A, $D, $T } from "@/types/abbr";

export interface IO<A extends $A, B extends $A> {
	readonly input: A;
	readonly output: B;
}

/**
 * A patch-based incremental function from `A` to `B`.
 * Both `evaluate` and `forward` must be pure functions.
 *
 * @param A The `Apply` for the input type
 * @param B The `Apply` for the output type
 */
export interface IF<A extends $A, B extends $A> extends IO<A, B> {
	readonly evaluate: (x: $T<A>) => $T<B>;
	readonly forward: (x: $T<A>, dx: $D<A>, y: $T<B>) => $D<B>;
}

export type Evaluate<A extends $A, B extends $A> = (x: $T<A>) => $T<B>;
export type Forward<A extends $A, B extends $A> = (
	x: $T<A>,
	dx: $D<A>,
	y: $T<B>,
) => $T<B>;

/**
 * An `IF` that accesses the inside of the input.
 * The `evaluate` is trivial enough that should not be cached.
 **/
export interface IFA<A extends $A, B extends $A> extends IO<A, B> {
	readonly evaluate: (x: $T<A>) => $T<B>;
	readonly forward: (x: $T<A>, dx: $D<A>, y?: never | undefined) => $D<B>;
}

/** An incremental function with a context type. */
export interface IFC<Ctx extends $A, A extends $A, B extends $A>
	extends IF<APair<A, Ctx>, B> {}
