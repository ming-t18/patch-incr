import type { APair } from "@/pair";
import type { $A, $D, $T } from "@/types/abbr";
import type { AnyApply } from "@/types/algebra";

export interface IFBase<A extends $A, B extends $A> {
	readonly input: A;
	readonly output: B;
}

export type Evaluate<A extends $A, B extends $A> = (x: $T<A>) => $T<B>;
export type Forward<A extends $A, B extends $A> = (
	x: $T<A>,
	dx: $D<A>,
	y: $T<B>,
) => $T<B>;

export enum IFKind {
	IFA = "IFA",
	IF1 = "IF1",
	IFR = "IFR",
}

/**
 * An incremental function from incremental type `A` to `B`
 * with an `evaluate` implementation that can be cheaply re-evalauted.
 * The `forward` implementation typically re-evaluates the `evaluate`
 * rather than receiving it from the caller through the 3rd argument.
 */
export interface IFA<A extends $A, B extends $A> extends IFBase<A, B> {
	readonly kind: IFKind.IFA;
	readonly evaluate: (x: $T<A>) => $T<B>;
	readonly forward: (x: $T<A>, dx: $D<A>) => $D<B>;
}

/**
 * An incremental function from `A` to `B` with a non-trival `evaluate`
 * implementation. The `forward` method receives the result of `evaluate`
 * through the 3rd argument.
 *
 * @param A The `Apply` for the input type
 * @param B The `Apply` for the output type
 */
export interface IF1<A extends $A, B extends $A> extends IFBase<A, B> {
	readonly kind: IFKind.IF1;
	readonly evaluate: (x: $T<A>) => $T<B>;
	readonly forward: (x: $T<A>, dx: $D<A>, y: $T<B>) => $D<B>;
}

/**
 * An incremental function from `A` to `B` with a residual of `R`
 * as part of the return value. The return value is a pair `[B, R]`
 * where `B` is the return value and `R` is the residual.
 *
 * All fields except `kind` follow the signature of `IF1<A, APair<B, R>>`.
 */
export interface IFR<A extends $A, B extends $A, R extends $A>
	extends IFBase<A, APair<B, R>> {
	readonly kind: IFKind.IFR;
	readonly evaluate: (x: $T<A>) => Readonly<[$T<B>, $T<R>]>;
	readonly forward: (
		x: $T<A>,
		dx: $D<A>,
		y: Readonly<[$T<B>, $T<R>]>,
	) => $D<APair<B, R>>;
}

/**
 * A type alias for 3 kinds of incremental function.
 * This type is recommended to represent
 * composable `IF`s in general.
 */
export type IF<A extends $A, B extends $A, R extends AnyApply = AnyApply> =
	| IFA<A, B>
	| IF1<A, B>
	| IFR<A, B, R>;

export type IFC<
	C extends $A,
	A extends $A,
	B extends $A,
	R extends AnyApply = AnyApply,
> = IF<APair<A, C>, B, R>;
