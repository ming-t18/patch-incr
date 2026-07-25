import fc, { type Arbitrary as Arb } from "fast-check";
import type { AnyTuple, KeyOfTuple } from "@/tuple";
import type { $A, $T } from "@/types/abbr";

export type { Arbitrary as Arb } from "fast-check";

import "./types";
import type { DRO } from "@/types/algebra";

export const arbEmptyOrReplace = <A extends $A, T extends $T<A> = $T<A>>(
	apply: A,
	gen: Arb<T>,
): Arb<DRO<T>> => {
	return fc.oneof(
		{ weight: 1, arbitrary: fc.constant(apply.empty) },
		{
			weight: 5,
			arbitrary: gen.map(apply.fromReplace, apply.isReplace as never),
		},
	);
};

export const mapShape = <
	Shape,
	Reshaped extends Record<Key, unknown>,
	Key extends keyof Shape = keyof Shape,
>(
	fn: <K1 extends Key>(key: K1, value: Shape[K1]) => Reshaped[K1],
	shape: Shape,
	keys = Object.keys(shape as never) as Key[],
): Reshaped => {
	const res = {} as Partial<Reshaped>;
	for (const k of keys) {
		res[k] = fn(k, shape[k]);
	}
	return res as Reshaped;
};

export const mapShapeTuple = <
	Shape extends AnyTuple,
	Reshaped extends AnyTuple,
>(
	fn: <Idx extends KeyOfTuple<Shape>>(
		i: Idx,
		value: Shape[Idx],
	) => Idx extends KeyOfTuple<Reshaped> ? Reshaped[Idx] : never,
	shape: Shape,
): Reshaped => {
	const n = shape.length;
	const res: Reshaped = Array(n).fill(null) as never;
	for (let i = 0; i < n; i++) {
		// @ts-expect-error Can't be checked
		res[i] = fn(i, shape[i]);
	}
	return res;
};

export const DRO_WEIGHT = 3;

export const MAX_ARRAY_LEN = 8;

export const ARB_VALUE_DEPTH = 10;

export const DEFAULT_DEPTH = 8;
