import type { Arbitrary as Arb } from "fast-check";
import fc from "fast-check";
import { AAtomic } from "@/atomic";
import { AConstant } from "@/constant";
import { AOptional } from "@/optional";
import { type AnyTuple, ATuple, type KeyOfTuple } from "@/tuple";
import type { $A, $D, $T } from "@/types/abbr";
import { AUnion, type DeriveUnionValue } from "@/union";

export type { Arbitrary as Arb } from "fast-check";

import "./types";
import { BaseProductShaped } from "@/product";
import { ARecord } from "@/record";
import type { AnyApply, InferApplyChange } from "@/types/algebra";
import type {
	AnyArbApply,
	ArbProdChangeFromRecordArb,
	ArbRecordValueFromRecordArb,
} from "./types";

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

AConstant.prototype.arbValue = function <T, D>(this: AConstant<T, D>) {
	return fc.constant(this.value);
};

AConstant.prototype.arbChange = function <T, D>(this: AConstant<T, D>, _?: T) {
	return fc.constant(this.empty);
};

AAtomic.prototype.arbValue = function <T>(this: AAtomic<T>) {
	if (!this.gen) {
		throw new Error("this.gen is not defined");
	}
	return this.gen;
};

AAtomic.prototype.arbChange = function <T>(this: AAtomic<T>, _?: T) {
	if (!this.gen) {
		throw new Error("this.gen is not defined");
	}
	return arbEmptyOrReplace(this, this.gen);
};

BaseProductShaped.prototype.arbValue = function <
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
>(this: BaseProductShaped<Prod, Shape, Key>) {
	if (!(this.fromRecord && this.arbProductRecord)) {
		throw new Error("BaseProductShaped methods must be defined");
	}

	const toRecord = this.toRecord;
	return this.arbProductRecord().map(
		this.fromRecord,
		toRecord ? (x) => toRecord(x as never) : undefined,
	);
};

ARecord.prototype.arbProductRecord = function <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(this: ARecord<Map, Key>) {
	return fc.record(
		mapShape<Map, ArbRecordValueFromRecordArb<Map, Key>, Key>(
			// @ts-expect-error Cannot be checked (assuming arbChange is defined)
			(_key, inner) => inner.arbValue(),
			this.shape,
		),
		{ requiredKeys: this.keys as Key[] as never[], noNullPrototype: true },
	);
};

const DRO_WEIGHT = 3;
BaseProductShaped.prototype.arbChange = function <
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
>(this: BaseProductShaped<Prod, Shape, Key>, value?: Prod) {
	const repPart = arbEmptyOrReplace(this, this.arbValue());
	return fc.oneof(
		{ weight: DRO_WEIGHT, arbitrary: repPart },
		{
			weight: 1,
			arbitrary: fc.record(
				mapShape<Shape, ArbProdChangeFromRecordArb<Shape, Key>, Key>(
					// @ts-expect-error Cannot be checked (assuming arbChange is defined)
					(key, inner) => inner.arbChange(value?.[key]),
					this.shape,
				),
				{ requiredKeys: [], noNullPrototype: true },
			),
		},
	);
};

AUnion.prototype.arbValue = function <
	Map extends Record<Key, AnyArbApply>,
	Key extends keyof Map = keyof Map,
>(this: AUnion<Map, Key>) {
	return fc.oneof(
		...Object.values(this.shape).map((inner) => ({
			weight: 1,
			arbitrary: genValueFromApply(inner as never),
		})),
	);
};

AUnion.prototype.arbChange = function <
	Map extends Record<Key, AnyArbApply>,
	Key extends keyof Map = keyof Map,
>(this: AUnion<Map, Key>, value?: DeriveUnionValue<Map, Key>) {
	const entries: Arb<InferApplyChange<Map[Key]>>[] = [];
	for (const disc of this.keys) {
		if (typeof value !== "undefined" && this.getDiscrimant(value) !== disc) {
			continue;
		}
		entries.push(this.shape[disc].arbChange(value));
	}
	if (entries.length === 0) {
		throw new Error("AUnion.arbChange: no cases generated");
	}

	return fc.oneof(
		{
			weight: DRO_WEIGHT,
			arbitrary: arbEmptyOrReplace(this, this.arbValue()),
		},
		{
			weight: 1,
			arbitrary: fc.oneof(...entries),
		},
	);
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
	constructor(override readonly gen: Arb<T>) {
		super();
	}
}

export const atomicWithGen = <T>(gen: Arb<T>) => new AtomicWithGen<T>(gen);

export const genValueFromApply = <A extends $A>(
	apply: A,
	params?: ApplyToGenValueParams,
): Arb<$T<A>> => {
	if (
		apply instanceof AConstant ||
		apply instanceof AAtomic ||
		apply instanceof BaseProductShaped ||
		apply instanceof AUnion
	) {
		return apply.arbValue();
	}

	if (apply instanceof ATuple) {
		return fc.tuple(
			...(mapShapeTuple(
				(_index, inner) => genValueFromApply(inner, params) as never,
				apply.shape,
			) as Arb<never>[]),
		) as Arb<never>;
	}
	// if (apply instanceof AUnion) {
	// 	return fc.oneof(
	// 		...Object.values(apply.shape).map((inner) => ({
	// 			weight: 1,
	// 			arbitrary: genValueFromApply(inner as never, params),
	// 		})),
	// 	);
	// }
	if (apply instanceof AOptional) {
		return fc.oneof(
			{ weight: 1, arbitrary: fc.constant(undefined) },
			{ weight: 4, arbitrary: genValueFromApply(apply.inner, params) },
		);
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};

export const genChangeFromApply = <A extends $A>(
	apply: A,
	params?: ApplyToGenValueParams,
): Arb<$D<A>> => {
	if (
		apply instanceof AConstant ||
		apply instanceof AAtomic ||
		apply instanceof BaseProductShaped ||
		apply instanceof AUnion
	) {
		return apply.arbChange();
	}

	const replacePart = [
		{
			weight: 1,
			arbitrary: arbEmptyOrReplace(apply, genValueFromApply(apply, params)),
		},
	];
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
	// if (apply instanceof AUnion) {
	// 	return fc.oneof(...replacePart, {
	// 		weight: 3,
	// 		arbitrary: fc.oneof(
	// 			...(Object.entries(apply.shape).map(([type, inner]) =>
	// 				fc.record({
	// 					type: fc.constant(type),
	// 					change: genChangeFromApply(inner as never, params),
	// 				}),
	// 			) as never),
	// 		),
	// 	});
	// }
	if (apply instanceof AOptional) {
		return fc.oneof(...replacePart, {
			weight: 3,
			arbitrary: genChangeFromApply(apply.inner, params),
		});
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};
