import type { Either } from "patch-incr/builder/either";
import type { Option } from "patch-incr/builder/option";
import type { $2, $3 } from "./hkt";

/**
 * An arrow transform lifting from inner arrow type `T` to outer arrow transformer type `F`.
 * @param T `: *2 -> *`
 * @param F `: *3 -> *` or `(*1 -> (*2 -> *))`
 */
export interface IATrans<T, F> {
	lift<A, B>(f: $2<T, A, B>): $3<F, T, A, B>;
	// tryUnlift<A, B>(f: $3<T1, T, A, B>): $2<T, A, B> | null;
}

export interface IAReader<Ctx, T> {
	read<A>(): $2<T, A, Ctx>;
	newReader<A, B>(): $2<T, [A, Ctx], B>;
}

/**
 * @param T `: *2 -> *`
 * @param T1 `: *2 -> *`
 */
export interface IAAddReader<Ctx, T, T1> {
	intro<A, B>(f: $2<T, [A, Ctx], B>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, [A, Ctx], B>;
}

/**
 * @param T `: *2 -> *`
 * @param T1 `: *2 -> *`
 * @param RBase `: *` -- The base type of the residuals.
 */
export interface IAAddResidual<T, T1, RBase = unknown> {
	intro<A, B, R extends RBase>(f: $2<T, A, [B, R]>): $2<T1, A, B>;
	elim<A, B, R extends RBase>(f: $2<T1, A, B>): $2<T, A, [B, R]>;
}

/**
 * @param T `: *2 -> *`
 * @param T1 `: *2 -> *`
 * @param RBase `: *` -- The written type, must be a monoid
 */
export interface IAAddWriter<T, T1, W> {
	intro<A, B>(f: $2<T, A, [B, W]>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, [B, W]>;
}

/**
 * @param T `: *2 -> *`
 * @param T1 `: *2 -> *`
 */
export interface IAAddOption<T, T1> {
	intro<A, B>(f: $2<T, A, Option<B>>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, Option<B>>;
}

/**
 * @param T `: *2 -> *`
 * @param T1 `: *2 -> *`
 * @param E `: *` -- The error type
 */
export interface IAAddError<T, T1, E> {
	intro<A, B>(f: $2<T, A, Either<E, B>>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, Either<E, B>>;
}

/**
 * @param T `: *2 -> *`
 * @param T1 `: *2 -> *`
 */
export interface IAAddList<T, T1> {
	intro<A, B>(f: $2<T, A, B[]>): $2<T1, A, B>;
	elim<A, B>(f: $2<T1, A, B>): $2<T, A, B[]>;
}
