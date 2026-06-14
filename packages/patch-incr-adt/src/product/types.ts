import type { DeriveRecordChangeNoReplace } from "@/record/types";
import type { AnyTuple, KeyOfTuple } from "@/tuple/types";
import type {
	AnyApply,
	Apply,
	DRO,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";

export type DeriveProductShapedReplacements<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = { readonly [k in Key]?: InferApplyValue<Shape[k]> | undefined };

export type DeriveProductShapedChange<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = { readonly [k in Key]?: InferApplyChange<Shape[k]> | undefined };

export type DeriveProductShapedChangeTuple<Tup extends AnyTuple<AnyApply>> =
	Tup extends []
		? readonly []
		: Tup extends [
					infer A extends AnyApply,
					...infer Rest extends AnyTuple<AnyApply>,
				]
			? readonly [InferApplyChange<A>, ...DeriveProductShapedChangeTuple<Rest>]
			: never;

export type DeriveProductChange<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = DeriveProductShapedChange<Shape, Key> | DRO<Prod>;

export type DeriveProductChangeTuple<Prod, Shape extends AnyTuple<AnyApply>> =
	| DeriveProductShapedChangeTuple<Shape>
	| DRO<Prod>;

export type ProductImpl<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = Pick<ApplyProductShaped<Prod, Shape, Key>, "assign" | "get">;

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
	assign: (
		value: Prod,
		replacements: DeriveProductShapedReplacements<Shape, Key>,
	) => Prod;
	get: <K extends Key>(value: Prod, key: K) => InferApplyValue<Shape[K]>;

	/**
	 * Given a change, and a list of keys (`KeySub[]`), return the
	 * portion of change (always a non-replace change) that affects the values
	 * under the keys.
	 */
	project: <KeySub extends Key = Key>(
		keys: KeySub[],
		change: DeriveProductChange<Prod, Shape, Key>,
	) => DeriveProductShapedChange<Shape, KeySub>;
}

export interface ApplyProductShapedTuple<Prod, Shape extends AnyTuple<AnyApply>>
	extends Apply<Prod, DeriveProductChangeTuple<Prod, Shape>> {
	assign: (value: Prod, change: DeriveProductShapedChangeTuple<Shape>) => Prod;
	get: <K extends KeyOfTuple<Shape>>(
		value: Prod,
		key: K,
	) => InferApplyValue<Shape[K]>;

	/**
	 * Given a change, and a list of keys (`KeySub[]`), return the
	 * portion of change (always a non-replace change) that affects the values
	 * under the keys.
	 */
	project: (
		keys: KeyOfTuple<Shape>[],
		change: DeriveProductChangeTuple<Prod, Shape>,
	) => DeriveProductShapedChangeTuple<Shape>;
}

export interface ProductApply<
	Prod,
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> extends Apply<Prod, DeriveProdChange<Prod, Map, Key>> {}

export interface ProductApplyTuple<Prod, Shape extends AnyTuple<AnyApply>>
	extends Apply<Prod, DeriveProdChangeTuple<Prod, Shape>> {}

export type DeriveProdChangeNoReplace<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = DeriveRecordChangeNoReplace<Shape, Key>;

export type DeriveProdChange<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = DeriveRecordChangeNoReplace<Shape, Key> | DRO<Prod>;

export type DeriveProdChangeTuple<Prod, Shape extends AnyTuple<AnyApply>> =
	| DeriveProductShapedChangeTuple<Shape>
	| DRO<Prod>;
