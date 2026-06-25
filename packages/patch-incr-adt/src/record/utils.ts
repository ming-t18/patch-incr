import { type AOptional, optional } from "@/optional";
import type { AnyApply } from "@/types";
import { type ARecord, record } from ".";

export const omit = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	ToExclude extends Record<never, true> = Record<never, true>,
>(
	{ shape }: ARecord<Map, Key>,
	toExclude: ToExclude,
): ARecord<Omit<Map, keyof ToExclude>, Exclude<Key, keyof ToExclude>> => {
	const shape1: Map = { ...shape };
	for (const key of Object.keys(toExclude)) {
		// @ts-expect-error Can't be checked
		delete shape1[key];
	}
	// @ts-expect-error Can't be checked
	return record(shape1);
};

export const merge = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	Shape1 extends Record<string, AnyApply> = Record<string, never>,
>(
	{ shape }: ARecord<Map, Key>,
	shape1: Shape1,
): ARecord<Map & Shape1, Key | keyof Shape1> => {
	const shape2: Map & Shape1 = { ...shape } as never;
	for (const key of Object.keys(shape1)) {
		// @ts-expect-error Can't be checked
		shape2[key] = shape1[key];
	}
	// @ts-expect-error Can't be checked
	return record(shape2);
};

export const partial = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>({
	shape,
}: ARecord<Map, Key>): ARecord<{ [k in Key]: AOptional<Map[k]> }, Key> => {
	const shape2: Map = { ...shape } as never;
	for (const key of Object.keys(shape)) {
		// @ts-expect-error Can't be checked
		shape2[key] = optional(shape1[key]);
	}
	// @ts-expect-error Can't be checked
	return record(shape2);
};
