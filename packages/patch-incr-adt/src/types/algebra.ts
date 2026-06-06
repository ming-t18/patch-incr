import type { DRO, ReplaceOnly } from "@/types/replaceOnly";

export type { DRO, ReplaceOnly } from "@/types/replaceOnly";

export interface Monoid<in out M> {
	readonly empty: M;
	readonly combine: (a: M, b: M) => M;
	readonly isEmpty: (value: M) => boolean;
}

export interface Change<in out T, in out DT> extends Monoid<DT> {
	readonly fromReplace: (value: T) => DT;
	readonly isReplace: (value: DT) => ReplaceOnly<T> | null;
}

export interface BaseApply {
	/**
	 * The type tag for an `Apply`.
	 *  - constant
	 *  - atomic
	 *  - record
	 *  - product
	 *  - union
	 *  - optional
	 */
	$type: string;
}

export interface Apply<in out T, in out DT = DRO<T>> extends Change<T, DT> {
	readonly apply: (value: T, change: DT) => T;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApply = Apply<any, any>;
// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApplyOf<T> = Apply<T, any>;

export type InferApplyValue<A> = A extends AnyApply
	? Parameters<A["fromReplace"]>[0]
	: never;

export type infer<A> = InferApplyValue<A>;
export type inferChange<A> = InferApplyChange<A>;

// should be: string
type _TestAV = InferApplyValue<Apply<string, "change">>;

export type InferApplyChange<A> = A extends AnyApply ? A["empty"] : never;

// should be: 'change'
type _TestAC = InferApplyChange<Apply<string, "change">>;

export interface ApplyAtomic<T> extends Apply<T /* , DRO<T> */> {}
