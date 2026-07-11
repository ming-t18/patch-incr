import type { $A, $D, $T } from "../abbr";
import type {
	Apply,
	Change,
	Group,
	InferApplyChange,
	InferApplyValue,
	Monoid,
} from "../algebra";
import type { IF1, IFA, IFBase } from "../func/incrFunc";
import type { IIso, IIsoA } from "../func/iso";
import type { ReplaceOnly } from "../replaceOnly";

declare const POINT: unique symbol;
declare const FROM: unique symbol;
declare const TO: unique symbol;

export type Point<P> = { [POINT]?: P };
export type Path<A, B> = { [FROM]?: A; [TO]?: B };

export interface Monoidoid<in out M> {
	readonly getEmpty: <A>() => M & Path<A, A>;
	readonly combine: <A, B, C>(
		a: M & Path<A, B>,
		b: M & Path<B, C>,
	) => M & Path<A, C>;
}

export interface Groupoid<in out M> extends Monoidoid<M> {
	readonly inverse: <A, B>(a: M & Path<A, B>) => M & Path<B, A>;
}

export interface Changeoid<in out T, in out M> extends Monoidoid<M> {
	readonly fromReplace: <A, B>(a: T & Point<B>) => M & Path<A, B>;
	readonly isReplace: <A, B>(
		a: M & Path<A, B>,
	) => ReplaceOnly<T & Point<B>> | null;
}

export interface Applyoid<in out T, in out D> extends Changeoid<T, D> {
	readonly "~apply": { readonly value: T; readonly change: D };
	readonly apply: <A, B>(a: T & Point<A>, da: D & Path<A, B>) => Point<B>;
	readonly canApply: <A, B>(a: T & Point<A>, da: D & Path<A, B>) => boolean;
}

export type $Point<A extends $A, P> = $T<A> & Point<P>;
export type $Path<A extends $A, P, Q> = $T<A> & Path<P, Q>;

export interface IFunctor<A extends $A, B extends $A> extends IFBase<A, B> {
	readonly evaluate: <P, Q>(x: $Point<A, P>) => $Point<B, Q>;
	readonly forward: <P, Q>(
		x: $Point<A, P>,
		dx: $Path<A, P, Q>,
		y: $Point<B, Q>,
	) => $Path<B, P, Q>;
}

export interface IFunctorA<A extends $A, B extends $A> extends IFBase<A, B> {
	readonly evaluate: <P, Q>(x: $T<A> & Point<P>) => $T<B> & Point<Q>;
	readonly forward: <P, Q>(
		x: $T<A> & Point<P>,
		dx: $D<A> & Path<P, Q>,
		y?: never | undefined,
	) => $D<B> & Point<Q>;
}

export interface IIsomorphism<A extends $A, B extends $A> {
	readonly fwd: IFunctor<A, B>;
	readonly inv: IFunctor<B, A>;
}

export interface IIsomorphismA<A extends $A, B extends $A> {
	readonly fwd: IFunctorA<A, B>;
	readonly inv: IFunctorA<B, A>;
}

export interface Oidify {
	<A extends Apply<T, D>, T = InferApplyValue<A>, D = InferApplyChange<A>>(
		input: A,
	): Applyoid<T, D>;
	<T, D>(input: Change<T, D>): Changeoid<T, D>;
	<T>(input: Group<T>): Groupoid<T>;
	<T>(input: Monoid<T>): Monoidoid<T>;
	<A extends $A, B extends $A>(input: IF1<A, B>): IFunctor<A, B>;
	<A extends $A, B extends $A>(input: IFA<A, B>): IFunctorA<A, B>;
	<A extends $A, B extends $A>(input: IIso<A, B>): IIsomorphism<A, B>;
	<A extends $A, B extends $A>(input: IIsoA<A, B>): IIsomorphismA<A, B>;
}

export const oidify: Oidify = ((x: never) => x) as never;
