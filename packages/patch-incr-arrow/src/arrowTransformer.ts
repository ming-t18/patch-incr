import type { Either } from "patch-incr/builder/either";
import type { Option } from "patch-incr/builder/option";
import type { $1, $2 } from "./hkt";

/**
 * An arrow transform lifting from inner arrow type `T` to outer arrow transformer type `F`.
 *
 * @param T `: A`
 * @param F `: A -> A`
 */
export interface IATrans<T, F> {
	lift<A, B>(f: $2<T, A, B>): $2<$1<F, T>, A, B>;
	// tryUnlift<A, B>(f: $2<$1<F, T>, A, B>): $2<T, A, B> | null;
}

/**
 * @param Ctx `: *`
 * @param T `: A`
 * @see [ArrowReader](https://hackage.haskell.org/package/arrows-0.4.4.2/docs/Control-Arrow-Operations.html#t:ArrowReader)
 */
export interface IAReader<Ctx, T> {
	/** Creates an arrow of `T` that discards the input and returns the current context. */
	read<A>(): $2<T, A, Ctx>;
	/**
	 * Context overrider:
	 * Given a reader arrow of `T`, creates a arrow that has the second
	 * argument to allow the context to on it to be overridden.
	 */
	newReader<A, B>(f1: $2<T, A, B>): $2<T, [A, Ctx], B>;
}

export interface IAList<T> {
	// option<A, B>(fn: $2<T, A, Option<B>>): $2<T, A, B>;
	// multi<A, B>(fn: $2<T, A, B[]>): $2<T, A, B>;
	collect<A extends WeakKey, B>(fn: $2<T, A, B>): $2<T, A, B[]>;
}

/**
 * @param T `: A`
 * @param T1 `: A`
 * @see [ArrowAddReader](https://hackage.haskell.org/package/arrows-0.4.4.2/docs/Control-Arrow-Transformer-Reader.html#t:ArrowAddReader)
 */
export interface IAAddReader<Ctx, T, T1> {
	intro<A, B>(f: $2<T, [A, Ctx], B>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, [A, Ctx], B>;
}

/**
 * @param T `: A`
 * @param T1 `: A`
 * @param RBase `: *` -- The base type of the residuals.
 */
export interface IAAddResidual<T, T1, RBase = unknown> {
	intro<A, B, R extends RBase>(f: $2<T, A, [B, R]>): $2<T1, A, B>;
	elim<A, B, R extends RBase>(f: $2<T1, A, B>): $2<T, A, [B, R]>;
}

/**
 * @param T `: A`
 * @param T1 `: A`
 * @param RBase `: *` -- The written type, must be a monoid
 */
export interface IAAddWriter<T, T1, W> {
	intro<A, B>(f: $2<T, A, [B, W]>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, [B, W]>;
}

/**
 * @param T `: A`
 * @param T1 `: A`
 */
export interface IAAddOption<T, T1> {
	intro<A, B>(f: $2<T, A, Option<B>>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, Option<B>>;
}

/**
 * @param T `: A`
 * @param T1 `: A`
 * @param E `: *` -- The error type
 */
export interface IAAddError<T, T1, E> {
	intro<A, B>(f: $2<T, A, Either<E, B>>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, Either<E, B>>;
}

/**
 * @param T `: A`
 * @param T1 `: A`
 */
export interface IAAddList<T, T1> {
	intro<A, B>(f: $2<T, A, B[]>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, B[]>;
}
