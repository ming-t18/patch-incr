import type {
	AnyApply,
	Apply,
	DRO,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";

export interface HasDiscrimant<T, D extends string = string> {
	readonly discrimant: (value: T) => D;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyHasDiscrimant = HasDiscrimant<any, any>;

export type DeriveUnionValue<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> = { readonly [k in Key]: InferApplyValue<Map[k]> }[Key];

export type UnionChangeEntry<K, D> = {
	readonly type: K;
	readonly change: D;
};

export type DeriveUnionChange<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> =
	| {
			readonly [k in Key]: UnionChangeEntry<k, InferApplyChange<Map[k]>>;
	  }[Key]
	| DRO<DeriveUnionValue<Map, Key>>;

export type UnionApply<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> = Apply<DeriveUnionValue<Map, Key>, DeriveUnionChange<Map, Key>>;
