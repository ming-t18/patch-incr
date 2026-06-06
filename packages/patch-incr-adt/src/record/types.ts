import type {
	AnyApply,
	Apply,
	DRO,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";

export type DeriveRecordValue<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> = {
	readonly [key in Key]: InferApplyValue<Map[key]>;
};

export type DeriveRecordChange<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> =
	| {
			readonly [key in Key]?: InferApplyChange<Map[key]>;
	  }
	| DRO<DeriveRecordValue<Map, Key>>;

// { name: ..., done: ... } | DRO<...>
type _TestDRC = DeriveRecordChange<{
	name: Apply<string, "name1">;
	done: Apply<boolean, "flip">;
}>;

export type RecordApply<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> = Apply<DeriveRecordValue<Map, Key>, DeriveRecordChange<Map, Key>>;

export interface Record$<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> extends RecordApply<Map, Key> {
	readonly $type: "record";
	readonly shape: Readonly<Map>;
	readonly fromMap: (
		change: { readonly [k in Key]?: InferApplyChange<Map[k]> },
	) => DeriveRecordChange<Map, Key>;
	readonly fromMapReplace: (
		change: { readonly [k in Key]?: InferApplyValue<Map[k]> },
	) => DeriveRecordChange<Map, Key>;
}

type _TestDRA = RecordApply<{
	name: Apply<string, "name1">;
	done: Apply<boolean, "flip">;
}>;
