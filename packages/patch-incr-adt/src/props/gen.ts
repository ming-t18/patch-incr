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
	) => Idx extends KeyOfTuple<Reshaped> ? Reshaped[Idx] : never,
	shape: Shape,
): Reshaped => {
	const n = shape.length;
	const res: Reshaped = Array(n).fill(null) as never;
	for (let i = 0; i < n; i++) {
		// @ts-expect-error Can't be checked
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
	arbAtomic: <T, A1 extends AAtomic<T>>(atomic: A1) => Arb<$T<A1>>;
}

export class AtomicWithGen<T> extends AAtomic<T> {
	constructor(readonly gen: Arb<T>) {
		super();
	}
}

export const atomicWithGen = <T>(gen: Arb<T>) => new AtomicWithGen<T>(gen);

export const genValueFromApply = <A extends $A>(
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
		if (!params?.arbAtomic) {
			throw new TypeError("can't generate atomic");
		}
		return params.arbAtomic(apply);
	}

	if (apply instanceof ARecord) {
		return fc.record(
			mapShape(
				(_key, inner) => genValueFromApply(inner, params) as never,
				apply.shape,
				// @ts-expect-error keys
				apply.keys,
			) as Record<string, Arb<never>>,
			// @ts-expect-error requiredKeys
			{ requiredKeys: apply.keys, noNullPrototype: true },
		) as Arb<never>;
	}
	if (apply instanceof ATuple) {
		return fc.tuple(
			...(mapShapeTuple(
				(_index, inner) => genValueFromApply(inner, params) as never,
				apply.shape,
			) as Arb<never>[]),
		) as Arb<never>;
	}
	if (apply instanceof AUnion) {
		return fc.oneof(
			...Object.values(apply.shape).map((inner) => ({
				weight: 1,
				arbitrary: genValueFromApply(inner as never, params),
			})),
		);
	}
	if (apply instanceof AOptional) {
		return fc.oneof(
			{ weight: 1, arbitrary: fc.constant(undefined) },
			{ weight: 4, arbitrary: genValueFromApply(apply.inner, params) },
		);
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};

export const arbEmptyOrReplace = <A extends $A, T extends $T<A> = $T<A>>(
	apply: A,
	gen: Arb<T>,
): Arb<$D<T>> => {
	return fc.oneof(
		{ weight: 1, arbitrary: fc.constant(apply.empty) },
		{
			weight: 5,
			arbitrary: gen.map(apply.fromReplace, apply.isReplace as never),
		},
	);
};

export const genChangeFromApply = <A extends $A>(
	apply: A,
	params?: ApplyToGenValueParams,
): Arb<$D<A>> => {
	if (apply instanceof AConstant) {
		return fc.constant(apply.empty);
	}
	if (apply instanceof AtomicWithGen) {
		return arbEmptyOrReplace<A>(apply, genValueFromApply(apply, params));
	}
	if (apply instanceof AAtomic) {
		if (params?.arbAtomic) {
			throw new TypeError("can't generate atomic");
		}
		return arbEmptyOrReplace<A>(apply, genValueFromApply(apply, params));
	}

	const replacePart = [
		{
			weight: 1,
			arbitrary: arbEmptyOrReplace(apply, genValueFromApply(apply, params)),
		},
	];
	if (apply instanceof ARecord) {
		return fc.oneof(...replacePart, {
			weight: 3,
			arbitrary: fc.record(
				mapShape(
					(_key, inner) => genChangeFromApply(inner, params),
					apply.shape,
					apply.keys as never[],
				) as Record<string, Arb<unknown>>,
				{ requiredKeys: [], noNullPrototype: true },
			) as never as Arb<unknown>,
		}) as Arb<never>;
	}
	if (apply instanceof ATuple) {
		return fc.oneof(...replacePart, {
			weight: 3,
			arbitrary: fc.tuple(
				...(mapShapeTuple(apply.shape, (_index, inner) =>
					genChangeFromApply(inner, params),
				) as never as Arb<unknown[]>),
			),
		});
	}
	if (apply instanceof AUnion) {
		return fc.oneof(...replacePart, {
			weight: 3,
			arbitrary: fc.oneof(
				...(Object.entries(apply.shape).map(([type, inner]) =>
					fc.record({
						type: fc.constant(type),
						change: genChangeFromApply(inner as never, params),
					}),
				) as never),
			),
		});
	}
	if (apply instanceof AOptional) {
		return fc.oneof(...replacePart, {
			weight: 3,
			arbitrary: genChangeFromApply(apply.inner, params),
		});
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};
