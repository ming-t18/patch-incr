import { type AOptional, optional } from "@/optional";
import type { AnyApply, OverwriteShape } from "@/types";
import { type ARecord, record } from ".";

export type APick<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	ToInclude extends Key = never,
> = ARecord<Pick<Shape, ToInclude>, ToInclude>;

export const pick = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	ToIncludeR extends Record<never, unknown> = Record<never, unknown>,
>(
	{ shape }: ARecord<Map, Key>,
	toInclude: ToIncludeR,
): APick<Map, Key, Key & keyof ToIncludeR> => {
	const keys: (Key & keyof ToIncludeR)[] = Object.keys(toInclude) as never[];
	const shape1: Pick<Map, Key & keyof ToIncludeR> = {} as never;
	for (const key of keys) {
		shape1[key] = shape[key];
	}
	return record(shape1 as Pick<Map, Key & keyof ToIncludeR>);
};

export type AOmit<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	ToExclude extends Key = never,
> = ARecord<Omit<Shape, ToExclude>, Exclude<Key, ToExclude>>;

export const omit = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	ToExcludeR extends Record<never, unknown> = Record<never, unknown>,
>(
	{ shape }: ARecord<Map, Key>,
	toExclude: ToExcludeR,
): AOmit<Map, Key, Key & keyof ToExcludeR> => {
	const shape1: Map = { ...shape };
	for (const key of Object.keys(toExclude)) {
		// @ts-expect-error Can't be checked
		delete shape1[key];
	}
	return record(shape1);
};

export type MergeShapes<
	Map extends Record<Key, AnyApply>,
	Shape1 extends Record<Key1, AnyApply>,
	Key extends keyof Map = keyof Map,
	Key1 extends keyof Shape1 = keyof Shape1,
> = Key & Key1 extends never
	? Map & Shape1
	: {
			[key in Key | Key1]: key extends Key1
				? Shape1[key]
				: key extends keyof Map
					? Map[key]
					: never;
		};

export type ARecordMerge<
	Map extends Record<Key, AnyApply>,
	Shape1 extends Record<Key1, AnyApply>,
	Key extends keyof Map = keyof Map,
	Key1 extends keyof Shape1 = keyof Shape1,
> = ARecord<MergeShapes<Map, Shape1, Key, Key1>, Key | Key1>;

export const merge = <
	Map extends Record<Key, AnyApply>,
	Shape1 extends Record<Key1, AnyApply>,
	Key extends keyof Map = keyof Map,
	Key1 extends keyof Shape1 = keyof Shape1,
>(
	{ shape }: ARecord<Map, Key>,
	shape1: Shape1,
): ARecordMerge<Map, Shape1, Key, Key1> => {
	const shape2: ARecordMerge<Map, Shape1, Key, Key1>["shape"] = {
		...shape,
	} as never;
	for (const key of Object.keys(shape1)) {
		// @ts-expect-error Can't be checked
		shape2[key] = shape1[key];
	}
	return record(shape2);
};

export const overwrite = <
	Shape extends Record<Key, AnyApply>,
	Shape1 extends Record<Key1, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	Key1 extends keyof Shape & keyof Shape1 = keyof Shape & keyof Shape1,
>(
	{ shape, keys }: ARecord<Shape, Key>,
	shape1: Shape1,
): ARecord<OverwriteShape<Shape, Shape1, Key, Key1>, Key> => {
	const shape2: OverwriteShape<Shape, Shape1, Key, Key1> = {
		...shape,
	} as never;
	for (const key of keys) {
		// @ts-expect-error Can't be checked
		shape2[key] = Object.hasOwn(shape1, key) ? shape1[key] : shape2[key];
	}
	return record(shape2);
};

export const partial = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>({
	shape,
	keys,
}: ARecord<Map, Key>): ARecord<{ [k in Key]: AOptional<Map[k]> }, Key> => {
	const shape2: Map = { ...shape } as never;
	for (const key of keys) {
		// @ts-expect-error Can't be checked
		shape2[key] = optional(shape1[key]);
	}
	// @ts-expect-error Can't be checked
	return record(shape2);
};
