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
import type { DeriveUnionChange, DeriveUnionValue } from "@/union";

export type { Arbitrary as Arb } from "fast-check";

export interface ArbApply<T, DT = DRO<T>> extends Apply<T, DT> {
	arbValue: () => Arb<T>;
	arbChange: (value?: T) => Arb<DT>;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyArbApply = ArbApply<any, any>;

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

export interface HasAtomicGen<T> {
	readonly gen?: Arb<T> | null | undefined;
}

declare module "@/atomic" {
	export interface AAtomic<T> {
		/** Used by `arbValue`/`arbChange`. Must be defined or else they throw. */
		readonly gen?: Arb<T> | null | undefined;

		arbValue: <T>(this: AAtomic<T> & HasAtomicGen<T>) => Arb<T>;
		arbChange: <T>(
			this: AAtomic<T> & HasAtomicGen<T>,
			value?: T,
		) => Arb<DRO<T>>;
	}
}

export interface HasArbProductRecord<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> {
	arbProductRecord: () => Arb<DeriveRecordValue<Shape, Key>>;
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

		arbValue: <
			Prod,
			Shape extends Record<Key, AnyApply>,
			Key extends keyof Shape = keyof Shape,
		>(
			this: BaseProductShaped<Prod, Shape, Key> &
				HasArbProductRecord<Shape, Key>,
		) => Arb<Prod>;
		arbChange: <
			Prod,
			Shape extends Record<Key, AnyApply>,
			Key extends keyof Shape = keyof Shape,
		>(
			this: BaseProductShaped<Prod, Shape, Key> &
				HasArbProductRecord<Shape, Key>,
			value?: Prod,
		) => Arb<DeriveProductChange<Prod, Shape, Key>>;
	}
}

declare module "@/union" {
	export interface AUnion<
		Map extends Record<Key, AnyApply>,
		Key extends keyof Map = keyof Map,
	> {
		arbValue: <
			Map extends Record<Key, AnyArbApply>,
			Key extends keyof Map = keyof Map,
		>(
			this: AUnion<Map, Key>,
		) => Arb<DeriveUnionValue<Map, Key>>;
		arbChange: <
			Map extends Record<Key, AnyArbApply>,
			Key extends keyof Map = keyof Map,
		>(
			this: AUnion<Map, Key>,
			value?: DeriveUnionValue<Map, Key>,
		) => Arb<DeriveUnionChange<Map, Key>>;
	}
}
