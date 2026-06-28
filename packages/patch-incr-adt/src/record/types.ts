import type { DeriveProductChange, DeriveProductShapedChange } from "@/product";
import type { AnyApply, Apply, InferApplyValue } from "@/types/algebra";

// type KeysWithUndefinedValue<T> = {
// 	[k in keyof T]: undefined extends T[k] ? k : never;
// }[keyof T];
// type KeysWithoutUndefinedValue<T> = {
// 	[k in keyof T]: undefined extends T[k] ? never : k;
// }[keyof T];
// type UndefinedToOptional<T> = {
// 	readonly [k1 in keyof T & KeysWithoutUndefinedValue<T>]: T[k1];
// } & {
// 	readonly [k1 in keyof T & KeysWithUndefinedValue<T>]?: T[k1];
// };
// type Test = UndefinedToOptional<{ a: string; b: undefined | number }>;
// Doesn't work (breaks recursive types)

export type DeriveRecordValue<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = { readonly [key in Key]: InferApplyValue<Shape[key]> };

export type DeriveRecordChangeNoReplace<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> = DeriveProductShapedChange<Map, Key>;

export type DeriveRecordChange<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> = DeriveProductChange<DeriveRecordValue<Map, Key>, Map, Key>;

// { name: ..., done: ... } | DRO<...>
type _TestDRC = DeriveRecordChange<{
	name: Apply<string, "name1">;
	done: Apply<boolean, "flip">;
}>;

export type RecordApply<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = Apply<DeriveRecordValue<Shape, Key>, DeriveRecordChange<Shape, Key>>;
