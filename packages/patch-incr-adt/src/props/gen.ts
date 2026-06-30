import fc, { type Arbitrary as Arb } from "fast-check";
import { AAtomic } from "@/atomic";
import { AConstant } from "@/constant";
import { AOptional } from "@/optional";
import { type AnyTuple, ATuple, type KeyOfTuple } from "@/tuple";
import type { $A, $D, $T } from "@/types/abbr";
import { AUnion, type DeriveUnionValue } from "@/union";

export type { Arbitrary as Arb } from "fast-check";

import "./types";
import {
	BaseProductShaped,
	BaseProductShapedTuple,
	type DeriveProductChange,
	type DeriveProductChangeTuple,
} from "@/product";
import { ARecord } from "@/record";
import { makeReplaceOnly } from "@/replaceOnly";
import type { DRO, InferApplyChange } from "@/types/algebra";
import type {
	AnyArbApply,
	ArbProdChangeFromRecordArb,
	ArbRecordValueFromRecordArb,
	HasArbProductRecord,
	HasArbProductTuple,
} from "./types";

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

const DRO_WEIGHT = 3;

AConstant.prototype.arbValue = function <T, D>(this: AConstant<T, D>) {
	return fc.constant(this.value);
};

AConstant.prototype.arbChange = function <T, D>(this: AConstant<T, D>, _?: T) {
	return fc.constant(this.empty);
};

AAtomic.prototype.arbValue = function <T>(this: AAtomic<T>): Arb<T> {
	if (!this.gen) {
		throw new Error("this.gen is not defined");
	}
	return this.gen;
} as never;

AAtomic.prototype.arbChange = function <T>(
	this: AAtomic<T>,
	_?: T,
): Arb<DRO<T>> {
	if (!this.gen) {
		throw new Error("this.gen is not defined");
	}
	return arbEmptyOrReplace(this, this.gen);
} as never;

BaseProductShaped.prototype.arbValue = function <
	Prod,
	Shape extends Record<Key, AnyArbApply>,
	Key extends keyof Shape = keyof Shape,
>(this: BaseProductShaped<Prod, Shape, Key> & HasArbProductRecord<Shape, Key>) {
	if (!(this.fromRecord && this.arbProductRecord)) {
		throw new Error("BaseProductShaped methods must be defined");
	}

	const { fromRecord, toRecord } = this;
	return this.arbProductRecord().map(
		fromRecord,
		toRecord ? (x) => toRecord(x as never) : undefined,
	);
};

BaseProductShapedTuple.prototype.arbValue = function <
	Prod,
	Shape extends AnyTuple<AnyArbApply>,
>(
	this: BaseProductShapedTuple<Prod, Shape> & HasArbProductTuple<Shape>,
): Arb<Prod> {
	if (!(this.fromTuple && this.toTuple)) {
		throw new Error("BaseProductShapedTuple methods must be defined");
	}

	const { fromTuple, toTuple } = this;
	return this.arbProductTuple().map(
		fromTuple,
		toTuple ? (x) => toTuple(x as never) : undefined,
	);
};

ARecord.prototype.arbProductRecord = function <
	Map extends Record<Key, AnyArbApply>,
	Key extends keyof Map = keyof Map,
>(this: ARecord<Map, Key>) {
	return fc.record<ArbRecordValueFromRecordArb<Map, Key>, Key>(
		mapShape<Map, ArbRecordValueFromRecordArb<Map, Key>, Key>(
			(_key, inner) => inner.arbValue(),
			this.shape,
		),
		{ requiredKeys: this.keys as Key[] as never[], noNullPrototype: true },
	);
};

ATuple.prototype.arbProductTuple = function <
	Shape extends AnyTuple<AnyArbApply>,
>(this: ATuple<Shape>) {
	return fc.tuple(...this.shape.map((inner) => inner.arbValue())) as Arb<never>;
};

BaseProductShaped.prototype.arbChange = function <
	Prod,
	Shape extends Record<Key, AnyArbApply>,
	Key extends keyof Shape = keyof Shape,
>(
	this: BaseProductShaped<Prod, Shape, Key> & HasArbProductRecord<Shape, Key>,
	value?: Prod,
) {
	const repPart = arbEmptyOrReplace(this, this.arbValue());
	const isDefined = typeof value !== "undefined";
	return fc.oneof(
		{ weight: DRO_WEIGHT, arbitrary: repPart },
		{
			weight: 1,
			arbitrary: fc.record<ArbProdChangeFromRecordArb<Shape, Key>, Key>(
				mapShape<Shape, ArbProdChangeFromRecordArb<Shape, Key>, Key>(
					(key, inner) =>
						isDefined
							? inner.arbChange(
									// @ts-expect-error value is defined here
									value[key],
								)
							: inner.arbChange(),
					this.shape,
				),
				{ requiredKeys: [], noNullPrototype: true },
			),
		},
	) as Arb<DeriveProductChange<Prod, Shape, Key>>;
};

BaseProductShapedTuple.prototype.arbChange = function <
	Prod,
	Shape extends AnyTuple<AnyArbApply>,
>(
	this: BaseProductShapedTuple<Prod, Shape> & HasArbProductTuple<Shape>,
	value?: Prod,
) {
	const repPart = arbEmptyOrReplace(this, this.arbValue());
	return fc.oneof(
		{ weight: DRO_WEIGHT, arbitrary: repPart },
		{
			weight: 1,
			arbitrary: fc.tuple(
				...this.shape.map((inner, key) =>
					inner.arbChange(
						// @ts-expect-error This access can't be checked
						value?.[key],
					),
				),
			),
		},
	) as Arb<DeriveProductChangeTuple<Prod, Shape>>;
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

AOptional.prototype.arbValue = function () {
	return fc.oneof(
		{ weight: 1, arbitrary: fc.constant(undefined) },
		{ weight: 4, arbitrary: this.inner.arbValue() },
	);
};

AOptional.prototype.arbChange = function (value) {
	// biome-ignore lint/complexity/noArguments: value is optional and can conflate with undefined
	const valueIsProvided = arguments.length === 1;
	const undefinedPart = {
		weight: 1,
		arbitrary: fc.constant(makeReplaceOnly<undefined>(undefined)),
	};
	const arbChangeInner = this.inner.arbChange(
		...(valueIsProvided ? [value] : []),
	);
	return fc.oneof(undefinedPart, {
		weight: 4,
		arbitrary: valueIsProvided
			? // only replace is accepted if original value is undefined
				value === undefined
				? arbChangeInner.filter((d) => this.inner.isReplace(d) !== null)
				: arbChangeInner
			: arbChangeInner,
	});
};

export interface GenApply<A extends $A> {
	readonly apply: A;
	readonly arbValue: Arb<$T<A>>;
	readonly arbChange: Arb<$D<A>>;
}

export class AtomicWithGen<T> extends AAtomic<T> {
	constructor(override readonly gen: Arb<T>) {
		super();
	}
}

export const atomicWithGen = <T>(gen: Arb<T>) => new AtomicWithGen<T>(gen);

export const genValueFromApply = <A extends $A>(apply: A): Arb<$T<A>> => {
	if (
		apply instanceof AConstant ||
		apply instanceof AAtomic ||
		apply instanceof BaseProductShaped ||
		apply instanceof BaseProductShapedTuple ||
		apply instanceof AUnion ||
		apply instanceof AOptional
	) {
		// @ts-expect-error Assuming it's defined here
		return apply.arbValue();
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};

export const genChangeFromApply = <A extends $A>(apply: A): Arb<$D<A>> => {
	if (
		apply instanceof AConstant ||
		apply instanceof AAtomic ||
		apply instanceof BaseProductShaped ||
		apply instanceof BaseProductShapedTuple ||
		apply instanceof AUnion ||
		apply instanceof AOptional
	) {
		// @ts-expect-error Assuming it's defined here
		return apply.arbChange();
	}

	throw new TypeError(`Unsupported subtype of Apply: ${apply.constructor}`);
};
