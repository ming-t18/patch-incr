import type { AnyApply } from "@/types";
import { record } from ".";
import type { Record$ } from "./types";

export const omit = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
	ToExclude extends Record<never, true> = Record<never, true>,
>(
	{ shape }: Record$<Map, Key>,
	toExclude: ToExclude,
): Record$<Omit<Map, keyof ToExclude>, Exclude<Key, keyof ToExclude>> => {
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
	{ shape }: Record$<Map, Key>,
	shape1: Shape1,
): Record$<Map & Shape1, Key | keyof Shape1> => {
	const shape2: Map & Shape1 = { ...shape } as never;
	for (const key of Object.keys(shape1)) {
		// @ts-expect-error Can't be checked
		shape2[key] = shape1[key];
	}
	// @ts-expect-error Can't be checked
	return record(shape2);
};
