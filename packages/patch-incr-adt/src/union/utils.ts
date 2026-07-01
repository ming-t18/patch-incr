import type { AnyApply, OverwriteShape } from "@/types";
import { type AUnion, union } from ".";

export type AUnionPick<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	ToInclude extends Key = never,
> = AUnion<Pick<Shape, ToInclude>, ToInclude>;

export const pick = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	ToIncludeR extends Record<never, unknown> = Record<never, unknown>,
>(
	{ shape, getDiscrimant }: AUnion<Map, Key>,
	toInclude: ToIncludeR,
): AUnionPick<Map, Key, Key & keyof ToIncludeR> => {
	const keys: (Key & keyof ToIncludeR)[] = Object.keys(toInclude) as never[];
	const shape1: Pick<Map, Key & keyof ToIncludeR> = {} as never;
	for (const key of keys) {
		shape1[key] = shape[key];
	}
	// @ts-expect-error Can't be checked
	return union(shape1, getDiscrimant);
};

export type AOmit<
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	ToExclude extends Key = never,
> = AUnion<Omit<Shape, ToExclude>, Exclude<Key, ToExclude>>;

export const omit = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	ToExcludeR extends Record<never, unknown> = Record<never, unknown>,
>(
	{ shape, getDiscrimant }: AUnion<Map, Key>,
	toExclude: ToExcludeR,
): AOmit<Map, Key, Key & keyof ToExcludeR> => {
	const shape1: Map = { ...shape };
	for (const key of Object.keys(toExclude)) {
		// @ts-expect-error Can't be checked
		delete shape1[key];
	}
	// @ts-expect-error Can't be checked
	return union(shape1, getDiscrimant);
};

export const merge = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	Shape1 extends Record<string, AnyApply> = Record<string, never>,
>(
	{ shape, getDiscrimant }: AUnion<Map, Key>,
	shape1: Shape1,
): AUnion<Map & Shape1, Key | keyof Shape1> => {
	const shape2: Map & Shape1 = { ...shape } as never;
	for (const key of Object.keys(shape1)) {
		// @ts-expect-error Can't be checked
		shape2[key] = shape1[key];
	}
	// @ts-expect-error Can't be checked
	return union(shape2, getDiscrimant);
};

export const overwrite = <
	Shape extends Record<Key, AnyApply>,
	Shape1 extends Record<Key1, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	Key1 extends keyof Shape & keyof Shape1 = keyof Shape & keyof Shape1,
>(
	{ shape, getDiscrimant, keys }: AUnion<Shape, Key>,
	shape1: Shape1,
): AUnion<OverwriteShape<Shape, Shape1, Key, Key1>, Key> => {
	const shape2: OverwriteShape<Shape, Shape1, Key, Key1> = {
		...shape,
	} as never;
	for (const key of keys) {
		// @ts-expect-error Can't be checked
		shape2[key] = Object.hasOwn(shape1, key) ? shape1[key] : shape2[key];
	}
	// @ts-expect-error Can't be checked
	return union(shape2, getDiscrimant);
};
