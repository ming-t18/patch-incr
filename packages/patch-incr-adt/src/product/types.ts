import type { DeriveRecordChangeNoReplace } from "@/record/types";
import type { AnyApply, Apply, DRO, InferApplyValue } from "@/types/algebra";

export type DeriveProductShapedChange<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = { readonly [k in Key]?: InferApplyValue<Shape[k]> };
export type DeriveProductChange<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = DeriveProductShapedChange<Shape, Key> | DRO<Prod>;

/**
 * Interface for a datatype `Prod` that is shaped like a product type.
 *
 * The member of the product is a record type with a set of keys (type `Key`)
 * and values of an `Apply<?, ?>` describing the corresponding value type.
 */
export interface ApplyProductShaped<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> extends Apply<Prod, DeriveProductChange<Prod, Shape, Key>> {
	assign: (value: Prod, change: DeriveProductShapedChange<Shape, Key>) => Prod;
	get: <K extends Key>(value: Prod, key: K) => InferApplyValue<Shape[K]>;

	/**
	 * Given a change, and a list of keys (`KeySub[]), return the
	 * portion of change (always a non-replace change) that affects the values
	 * under the keys.
	 */
	project: <KeySub extends Key = Key>(
		keys: KeySub[],
		change: DeriveProductChange<Prod, Shape, Key>,
	) => DeriveProductShapedChange<Shape, KeySub>;
}

export interface ProductApply<
	Prod,
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> extends Apply<Prod, DeriveProdChange<Prod, Map, Key>> {}

export type DeriveProdChangeNoReplace<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = DeriveRecordChangeNoReplace<Shape, Key>;

export type DeriveProdChange<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = DeriveRecordChangeNoReplace<Shape, Key> | DRO<Prod>;
