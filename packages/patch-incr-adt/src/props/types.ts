import type { Arbitrary as Arb } from "fast-check";
import type { DeriveRecordValue } from "@/record/types";
import type { AnyTuple, DeriveTupleValue } from "@/tuple";
import type { $D, $T } from "@/types/abbr";
import type {
	AnyApply,
	Apply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";

export type { Arbitrary as Arb } from "fast-check";

export const NO_VALUE = Symbol.for("patch-incr-adt:NO_VALUE");
export type NO_VALUE = typeof NO_VALUE;

export interface ArbChangeConfig<T> {
	readonly value?: T;
	readonly droWeight?: number;
	readonly nullWeight?: number;
	readonly depth?: number;
}

export interface ArbApply<A extends Apply<T, DT>, T = $T<A>, DT = $D<A>> {
	readonly arbValue: () => Arb<T>;
	readonly arbChange: (opts?: ArbChangeConfig<T>) => Arb<DT>;
}

export interface HasArbApply<T, DT> extends Apply<T, DT> {
	getArbApply: () => ArbApply<this>;
}

export const RECURSIVE = Symbol("RECURSIVE");
/** An `Apply` can extent `{ [RECURSIVE]?: true}` to avoid infinite recursion. */
export type RECURSIVE = typeof RECURSIVE;

/** Brand indicating an `Apply` is recursive and infinite recursion must be avoided for typeclass derivation. */
export type RecBrand = { [RECURSIVE]?: true };

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyHasArbApply = HasArbApply<any, any>;

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

export type OmitRecursive<T extends {}> = {
	[k in keyof T]: T[k] extends RecBrand ? never : T[k];
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
		getArbApply: () => ArbApply<this>;
	}
}

export interface HasAtomicGen<T> {
	readonly gen: Arb<T>;
}

declare module "@/atomic" {
	export interface AAtomic<T> {
		/** Used by `arbValue`/`arbChange`. Must be defined or else they throw. */
		readonly gen?: Arb<T> | null | undefined;
		getArbApply: this extends HasAtomicGen<T>
			? () => ArbApply<this>
			: undefined;
	}
}

export interface HasArbProductRecord<
	Shape extends Record<Key, AnyHasArbApply>,
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

		getArbApply: OmitRecursive<Shape> extends Record<Key, AnyHasArbApply>
			? () => ArbApply<this>
			: undefined;
	}
}

export interface HasArbProductTuple<Shape extends AnyTuple<AnyHasArbApply>> {
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

		getArbApply: OmitRecursive<Shape> extends AnyTuple<AnyHasArbApply>
			? () => ArbApply<this>
			: undefined;
	}
}

declare module "@/record" {
	export interface ARecord<
		Map extends Record<Key, AnyApply>,
		Key extends keyof Map = keyof Map,
	> {
		arbProductRecord: OmitRecursive<Map> extends Record<Key, AnyHasArbApply>
			? () => Arb<DeriveRecordValue<Map, Key>>
			: undefined;
	}
}

declare module "@/tuple/tuple" {
	export interface ATuple<Shape extends AnyTuple<AnyApply>> {
		arbProductTuple: Shape extends AnyTuple<AnyHasArbApply>
			? () => Arb<DeriveTupleValue<Shape>>
			: undefined;
	}
}

declare module "@/union" {
	export interface AUnion<
		Map extends Record<Key, AnyApply>,
		Key extends keyof Map = keyof Map,
	> {
		getArbApply: OmitRecursive<Map> extends Record<Key, AnyHasArbApply>
			? () => ArbApply<this>
			: undefined;
	}
}

declare module "@/optional" {
	export interface AOptional<
		A extends Apply<T, DT>,
		T = InferApplyValue<A>,
		DT = InferApplyChange<A>,
	> {
		getArbApply: A extends HasArbApply<T, DT>
			? () => ArbApply<this>
			: undefined;
	}
}

declare module "@/map" {
	export interface AMapValue<
		A extends Apply<T0, DT0>,
		T,
		T0 = $T<A>,
		DT0 = $D<A>,
	> {
		getArbApply: A extends HasArbApply<T0, DT0>
			? () => ArbApply<this>
			: undefined;
	}
}

declare module "@/array/stack" {
	export interface AArrayStack<A extends Apply<T, DT>, T = $T<A>, DT = $D<A>> {
		getArbApply: A extends HasArbApply<T, DT>
			? () => ArbApply<this>
			: undefined;
	}
}
