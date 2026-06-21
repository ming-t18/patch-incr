// @ts-nocheck
import type { Arbitrary as Arb } from "fast-check";
import fc from "fast-check";
import { AAtomic } from "@/atomic";
import { AConstant } from "@/constant";
import { AOptional } from "@/optional";
import { ARecord } from "@/record";
import { type AnyTuple, ATuple, type KeyOfTuple } from "@/tuple";
import type { $A, $D, $T } from "@/types/abbr";
import { AUnion } from "@/union";

export type { Arbitrary as Arb } from "fast-check";

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
	) => Reshaped[Idx],
	shape: Shape,
): Reshaped => {
	const n = shape.length;
	const res: Reshaped = Array(n).fill(null) as never;
	for (let i = 0; i < n; i++) {
		res[i] = fn(i, shape[k]);
	}
	return res;
};

export interface GenApply<A extends $A> {
	readonly apply: A;
	readonly arbValue: Arb<$T<A>>;
	readonly arbChange: Arb<$D<A>>;
}

export interface ApplyToGenValueParams {
	// biome-ignore lint/suspicious/noExplicitAny: intentional
	arbAtomic: <A1 extends AAtomic<any>>(atomic: A1) => Arb<$T<A1>>;
}

export class AtomicWithGen<T> extends AAtomic<T> {
	constructor(readonly gen: Arb<T>) {
		super();
	}
}

export const atomicWithGen = <T>(gen: Arb<T>) => new AtomicWithGen<T>(gen);

export const applyToGenValue = <A extends $A>(
	apply: A,
	params?: ApplyToGenValueParams,
): Arb<$T<A>> => {
	if (apply instanceof AConstant) {
		return fc.constant(apply.value);
	}
	if (apply instanceof AtomicWithGen) {
		return apply.gen;
	}
	if (apply instanceof AAtomic) {
		if (params?.arbAtomic) {
			throw new TypeError("can't generate atomic");
		}
		return params.arbAtomic(apply);
	}

	if (apply instanceof ARecord) {
		return fc.record(
			mapShape(
				(_key, inner) => applyToGenValue(inner, params),
				apply.shape,
				apply.keys,
			),
			{ requiredKeys: apply.keys },
		);
	}
	if (apply instanceof ATuple) {
		return fc.tuple(
			...mapShapeTuple(apply.shape, (_index, inner) =>
				applyToGenValue(inner, params),
			),
		);
	}
	if (apply instanceof AUnion) {
		return fc.oneof(
			...Object.values(apply.shape).map((inner) => ({
				weight: 1,
				arbitrary: applyToGenValue(inner, params),
			})),
		);
	}
	if (apply instanceof AOptional) {
		return fc.oneof(
			{ weight: 1, arbitrary: fc.constant(undefined) },
			{ weight: 4, arbitrary: applyToGenValue(apply.inner, params) },
		);
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};

const _applyToGenApply = <A extends $A>(_apply: A): GenApply<A, T> => {};
