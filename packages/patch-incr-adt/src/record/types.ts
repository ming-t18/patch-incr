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

export type RequiredKeys<
	// biome-ignore lint/suspicious/noExplicitAny: intentional
	Obj extends Record<Key, any>,
	Key extends keyof Obj = keyof Obj,
> = {
	[k in keyof Obj]: undefined extends Obj[k] ? k : never;
}[Key];

export type OptionalKeys<
	// biome-ignore lint/suspicious/noExplicitAny: intentional
	Obj extends Record<Key, any>,
	Key extends keyof Obj = keyof Obj,
> = {
	[k in keyof Obj]: undefined extends Obj[k] ? never : k;
}[Key];

export type AddQuestionMarks<
	// biome-ignore lint/suspicious/noExplicitAny: intentional
	Obj extends Record<Key, any>,
	Key extends keyof Obj,
> = { readonly [k in RequiredKeys<Obj, Key>]: Obj[k] } & {
	readonly [k in OptionalKeys<Obj, Key>]?: Obj[k];
} & { [k in Key]?: unknown };

export type RequiredKeysByShape<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = {
	[k in Key]: Shape[k] extends { $type: "optional" } ? never : k;
}[Key];

export type OptionalKeysByShape<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = {
	[k in Key]: Shape[k] extends { $type: "optional" } ? k : never;
}[Key];

export type AddQuestionMarksByShape<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape,
> = {
	readonly [k in RequiredKeysByShape<Shape, Key>]: InferApplyValue<Shape[k]>;
} & {
	readonly [k in OptionalKeysByShape<Shape, Key>]?: InferApplyValue<Shape[k]>;
} & { [k in Key]?: unknown };

export type DeriveRecordValue<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> = { readonly [key in Key]: InferApplyValue<Shape[key]> };

// Will break recursive types if used
// AddQuestionMarksByShape<Shape, Key>;
// AddQuestionMarks<
// 	{ readonly [key in Key]: InferApplyValue<Shape[key]> },
// 	Key
// >;

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
