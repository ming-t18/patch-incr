import type { Arbitrary as Arb } from "fast-check";
import type { DeriveProductChange, DeriveProductChangeTuple } from "@/product";
import type { DeriveRecordValue } from "@/record/types";
import type { AnyTuple, DeriveTupleValue } from "@/tuple";
import type { $D } from "@/types/abbr";
import type {
	AnyApply,
	Apply,
	DRO,
	InferApplyChange,
	InferApplyValue,
	ReplaceOnly,
} from "@/types/algebra";
import type { DeriveUnionChange, DeriveUnionValue } from "@/union";

export type { Arbitrary as Arb } from "fast-check";

export interface ArbApply<T, DT = DRO<T>> extends Apply<T, DT> {
	/** Boolean flag to determine if `ArbApply` is defined. */
	readonly "~arbApplyDefined": true;
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
		readonly "~arbApplyDefined": true;
		arbValue: () => Arb<T>;
		arbChange: (value?: T) => Arb<D>;
	}
}

export interface HasAtomicGen<T> {
	readonly gen: Arb<T>;
}

declare module "@/atomic" {
	export interface AAtomic<T> {
		/** Used by `arbValue`/`arbChange`. Must be defined or else they throw. */
		readonly gen?: Arb<T> | null | undefined;
		readonly "~arbApplyDefined": this extends HasAtomicGen<T> ? true : false;

		arbValue: this extends HasAtomicGen<T> ? <T>() => Arb<T> : undefined;
		arbChange: this extends HasAtomicGen<T>
			? (value?: T) => Arb<DRO<T>>
			: undefined;
	}
}

export interface HasArbProductRecord<
	Shape extends Record<Key, AnyArbApply>,
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
		arbProductRecord?: (() => Arb<DeriveRecordValue<Shape, Key>>) | undefined;

		arbValue: <
			Prod,
			Shape extends Record<Key, AnyArbApply>,
			Key extends keyof Shape = keyof Shape,
		>(
			this: BaseProductShaped<Prod, Shape, Key> &
				HasArbProductRecord<Shape, Key>,
		) => Arb<Prod>;
		arbChange: <
			Prod,
			Shape extends Record<Key, AnyArbApply>,
			Key extends keyof Shape = keyof Shape,
		>(
			this: BaseProductShaped<Prod, Shape, Key> &
				HasArbProductRecord<Shape, Key>,
			value?: Prod,
		) => Arb<DeriveProductChange<Prod, Shape, Key>>;
	}
}

export interface HasArbProductTuple<Shape extends AnyTuple<AnyArbApply>> {
	arbProductTuple: () => Arb<DeriveTupleValue<Shape>>;
}

declare module "@/product/tuple" {
	export interface BaseProductShapedTuple<
		Prod,
		Shape extends AnyTuple<AnyApply>,
	> {
		/**
		 * Generator for the tuple's parts.
		 * Used by `arbValue`/`arbChange`. Must be defined or else they throw.
		 */
		arbProductTuple?: (() => Arb<DeriveTupleValue<Shape>>) | undefined;

		arbValue<Prod, Shape extends AnyTuple<AnyArbApply>>(
			this: BaseProductShapedTuple<Prod, Shape> & HasArbProductTuple<Shape>,
		): Arb<Prod>;
		// The commented out code above doesn't pass type checking of correctly implementing interface
		// arbChange<Prod, Shape extends AnyTuple<AnyArbApply>>(
		// 	this: BaseProductShapedTuple<Prod, Shape> & HasArbProductTuple<Shape>,
		// 	value?: Prod,
		// ): Arb<DeriveProductChangeTuple<Prod, Shape>>;
		arbChange: Shape extends AnyTuple<AnyArbApply>
			? (value?: Prod) => Arb<DeriveProductChangeTuple<Prod, Shape>>
			: undefined;
	}
}

declare module "@/record" {
	export interface ARecord<
		Map extends Record<Key, AnyApply>,
		Key extends keyof Map = keyof Map,
	> {
		readonly "~arbApplyDefined": Map extends Record<Key, AnyArbApply>
			? true
			: false;
		arbProductRecord: Map extends Record<Key, AnyArbApply>
			? () => Arb<DeriveRecordValue<Map, Key>>
			: undefined;
	}
}

declare module "@/tuple/tuple" {
	export interface ATuple<Shape extends AnyTuple<AnyApply>> {
		readonly "~arbApplyDefined": Shape extends AnyTuple<AnyArbApply>
			? true
			: false;
		arbProductTuple: Shape extends AnyTuple<AnyArbApply>
			? () => Arb<DeriveTupleValue<Shape>>
			: undefined;
	}
}

declare module "@/union" {
	export interface AUnion<
		Map extends Record<Key, AnyApply>,
		Key extends keyof Map = keyof Map,
	> {
		readonly "~arbApplyDefined": Map extends Record<Key, AnyArbApply>
			? true
			: false;
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

declare module "@/optional" {
	export interface AOptional<
		A extends Apply<T, DT>,
		T = InferApplyValue<A>,
		DT = InferApplyChange<A>,
	> {
		readonly "~arbApplyDefined": A extends AnyArbApply ? true : false;
		arbValue: <
			A extends ArbApply<T, DT>,
			T = InferApplyValue<A>,
			DT = InferApplyChange<A>,
		>(
			this: AOptional<A, T, DT>,
		) => Arb<T | undefined>;
		arbChange: <A extends ArbApply<T, DT>, T, DT>(
			this: AOptional<A, T, DT>,
			value?: T,
		) => Arb<DT | ReplaceOnly<undefined>>;
	}
}

declare module "@/map" {
	export interface AMapValue<A extends AnyApply, T> {
		readonly "~arbApplyDefined": A extends AnyArbApply ? true : false;
		arbValue: <A extends AnyArbApply, T>(this: AMapValue<A, T>) => Arb<T>;
		arbChange: <A extends AnyArbApply, T>(
			this: AMapValue<A, T>,
			value?: T,
		) => Arb<$D<A>>;
	}
}
