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

export interface Union$<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> extends UnionApply<Map, Key> {
	readonly $type: "union";
	readonly $: Readonly<Map>;
	readonly getDiscrimant: (value: InferApplyValue<UnionApply<Map, Key>>) => Key;
	readonly fromChangeCase: <K extends Key>(
		type: K,
		change: InferApplyChange<Map[K]>,
	) => UnionChangeEntry<K, InferApplyChange<Map[K]>>;
	readonly fromReplaceCase: <K extends Key>(
		type: K,
		replace: InferApplyValue<Map[K]>,
	) => UnionChangeEntry<K, InferApplyChange<Map[K]>>;
}

type _Test1 = DeriveUnionValue<{
	left: Apply<string, DRO<string>>;
	right: Apply<number, DRO<number>>;
}>;
type _Test2 = DeriveUnionChange<{
	left: Apply<string, DRO<string>>;
	right: Apply<number, DRO<number>>;
}>;

type _Union$1 = Union$<{
	left: Apply<string, DRO<string>>;
	right: Apply<number, DRO<number>>;
}>;
