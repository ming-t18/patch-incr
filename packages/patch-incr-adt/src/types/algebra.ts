import type { DRO, ReplaceOnly } from "@/types/replaceOnly";

export type { DRO, ReplaceOnly } from "@/types/replaceOnly";

export type Defined<T> = T extends undefined
	? never
	: T extends null
		? never
		: T;

export type Writable<T> = { [k in keyof T]: T[k] };

export interface Monoid<in out M> {
	readonly empty: M;
	readonly combine: (a: M, b: M) => M;
	readonly isEmpty: (value: M) => boolean;
}

export interface Group<in out M> extends Monoid<M> {
	readonly inverse: (a: M) => M;
}

export interface Change<in out T, in out DT> extends Monoid<DT> {
	readonly fromReplace: (value: T) => DT;
	readonly isReplace: (value: DT) => ReplaceOnly<T> | null;
}

export interface BaseApply<TypeTag extends string = string> {
	/**
	 * The type tag for an `Apply`.
	 *  - constant
	 *  - atomic
	 *  - record
	 *  - product
	 *  - union
	 *  - optional
	 */
	$type: TypeTag;
}

/** A change-type applier. */
export interface Apply<in out T, in out DT = DRO<T>> extends Change<T, DT> {
	readonly "~apply": { readonly value: T; readonly change: DT };
	readonly apply: (value: T, change: DT) => T;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApply = Apply<any, any>;
// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApplyOf<T> = Apply<T, any>;

export type InferApplyValue<A> = A extends AnyApply
	? A["~apply"]["value"]
	: never;

export type InferApplyChange<A> = A extends AnyApply
	? A["~apply"]["change"]
	: never;

export interface Atomic$<T> extends Apply<T /* , DRO<T> */> {
	$type: "atomic";
}

export type infer<A> = InferApplyValue<A>;
export type inferChange<A> = InferApplyChange<A>;
