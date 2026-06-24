import type { Arbitrary as Arb } from "fast-check";
import type { DeriveProductChange } from "@/product";
import type { DeriveRecordValue } from "@/record/types";
import type {
	AnyApply,
	Apply,
	DRO,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";

export type { Arbitrary as Arb } from "fast-check";

export interface ArbApply<T, DT = DRO<T>> extends Apply<T, DT> {
	arbValue: () => Arb<T>;
	arbChange: (value?: T) => Arb<DT>;
}

export type ArbRecordValueFromRecordArb<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = {
	readonly [k in Key]: Arb<InferApplyValue<Shape[k]>>;
};

export type ArbProdChangeFromRecordArb<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = {
	readonly [k in Key]: Arb<InferApplyChange<Shape[k]>>;
};

declare module "@/types/algebra" {
	export interface Apply<in out T, in out DT> {
		arbValue?: () => Arb<T>;
		arbChange?: (value?: T) => Arb<DT>;
	}
}

declare module "@/constant" {
	// The `interface` keyword augments the `class`
	export interface AConstant<T, D> {
		arbValue: () => Arb<T>;
		arbChange: (value?: T) => Arb<D>;
	}
}
declare module "@/atomic" {
	export interface AAtomic<T> {
		/** Used by `arbValue`/`arbChange`. Must be defined or else they throw. */
		readonly gen?: Arb<T> | null | undefined;

		arbValue: () => Arb<T>;
		arbChange: (value?: T) => Arb<DRO<T>>;
	}
}
declare module "@/product/object" {
	export interface BaseProductShaped<
		Prod,
		Shape extends Record<Key, AnyApply>,
		Key extends keyof Shape = keyof Shape,
	> {
		/**
		 * Generator for the record's parts.
		 * Used by `arbValue`/`arbChange`. Must be defined or else they throw.
		 */
		arbProductRecord?: () => Arb<DeriveRecordValue<Shape, Key>>;

		arbValue: () => Arb<Prod>;
		arbChange: (value?: Prod) => Arb<DeriveProductChange<Prod, Shape, Key>>;
	}
}
