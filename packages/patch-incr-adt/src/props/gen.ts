import fc, { type Arbitrary as Arb } from "fast-check";
import { AAtomic } from "@/atomic";
import { AConstant } from "@/constant";
import { AOptional } from "@/optional";
import type { AnyTuple, ATuple, KeyOfTuple } from "@/tuple";
import type { $A, $D, $T } from "@/types/abbr";
import { AUnion } from "@/union";

export type { Arbitrary as Arb } from "fast-check";

import "./types";
import { AMapValue } from "@/map";
import {
	BaseProductShaped,
	BaseProductShapedTuple,
	type DeriveProductChange,
	type DeriveProductChangeTuple,
} from "@/product";
import { ARecord } from "@/record";
import { makeReplaceOnly } from "@/replaceOnly";
import type { Apply, DRO, InferApplyChange } from "@/types/algebra";
import { diveArbChangeConfig } from "./opts";
import type {
	AnyHasArbApply,
	ArbApply,
	ArbChangeConfig,
	ArbProdChangeFromRecordArb,
	ArbRecordValueFromRecordArb,
	HasArbApply,
	HasArbProductRecord,
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

export class ArbConstant<A extends AConstant<T, D>, T = $T<A>, D = $D<A>>
	implements ArbApply<A, T, D>
{
	constructor(readonly apply: A) {}

	arbValue(): Arb<T> {
		return fc.constant(this.apply.value);
	}
	arbChange(_?: ArbChangeConfig<T>): Arb<D> {
		return fc.constant(this.apply.empty);
	}
}

AConstant.prototype.getArbApply = function <T, D>(this: AConstant<T, D>) {
	return new ArbConstant(this);
};

export class ArbAtomic<A extends AAtomic<T>, T = $T<A>> implements ArbApply<A> {
	constructor(readonly apply: A) {}

	arbValue(): Arb<T> {
		const gen = this.apply.gen;
		if (!gen) {
			throw new Error("this.gen is not defined");
		}
		return gen;
	}

	arbChange(_?: ArbChangeConfig<T>): Arb<$D<A>> {
		return fc.constant(this.apply.empty);
	}
}

AAtomic.prototype.getArbApply = function <T>(this: AAtomic<T>) {
	return new ArbAtomic(this);
} as never;

export class ArbProductShaped<
	A extends BaseProductShaped<Prod, Shape, Key>,
	Prod,
	Shape extends Record<Key, AnyHasArbApply>,
	Key extends keyof Shape = keyof Shape,
> implements ArbApply<A>
{
	constructor(readonly apply: A) {}

	arbValue() {
		const apply = this.apply;
		if (!(apply.fromRecord && apply.arbProductRecord)) {
			throw new Error("BaseProductShaped methods must be defined");
		}

		const toRecord = apply.toRecord;
		return apply
			.arbProductRecord()
			.map(
				apply.fromRecord,
				toRecord ? (x) => toRecord(x as never) : undefined,
			);
	}

	arbChange(opts?: ArbChangeConfig<Prod>): Arb<$D<A>> {
		const repPart = arbEmptyOrReplace(this.apply, this.arbValue());
		const isDefined = opts && "value" in opts && opts.value;
		return fc.oneof(
			{ weight: opts?.droWeight ?? DRO_WEIGHT, arbitrary: repPart },
			{
				weight: 1,
				arbitrary: fc.record<ArbProdChangeFromRecordArb<Shape, Key>, Key>(
					mapShape<Shape, ArbProdChangeFromRecordArb<Shape, Key>, Key>(
						(key, inner) => {
							return inner.getArbApply().arbChange({
								...opts,
								...(isDefined
									? {
											value: this.apply.get(opts.value, key),
										}
									: {}),
							});
						},
						this.apply.shape,
					),
					{ requiredKeys: [], noNullPrototype: true },
				),
			},
		) as Arb<DeriveProductChange<Prod, Shape, Key>>;
	}
}

BaseProductShaped.prototype.getArbApply = function <
	Prod,
	Shape extends Record<Key, AnyHasArbApply>,
	Key extends keyof Shape = keyof Shape,
>(this: BaseProductShaped<Prod, Shape, Key> & HasArbProductRecord<Shape, Key>) {
	// @ts-expect-error Passing "this"
	return new ArbProductShaped(this);
};

ARecord.prototype.arbProductRecord = function <
	Map extends Record<Key, AnyHasArbApply>,
	Key extends keyof Map = keyof Map,
>(this: ARecord<Map, Key>) {
	const keys = this.keys;
	const shape = this.shape;
	return fc.record<ArbRecordValueFromRecordArb<Map, Key>, Key>(
		mapShape<Map, ArbRecordValueFromRecordArb<Map, Key>, Key>(
			(_key, inner) => inner.getArbApply().arbValue(),
			shape,
		),
		{ requiredKeys: keys as Key[] as never[], noNullPrototype: true },
	);
};

ARecord.prototype.arbProductRecord = function <
	Map extends Record<Key, AnyHasArbApply>,
	Key extends keyof Map = keyof Map,
>(this: ARecord<Map, Key>) {
	const keys = this.keys;
	const shape = this.shape;
	return fc.record<ArbRecordValueFromRecordArb<Map, Key>, Key>(
		mapShape<Map, ArbRecordValueFromRecordArb<Map, Key>, Key>(
			(_key, inner) => inner.getArbApply().arbValue(),
			shape,
		),
		{ requiredKeys: keys as Key[] as never[], noNullPrototype: true },
	);
};

export class ArbTupleShaped<
	A extends BaseProductShapedTuple<Prod, Shape>,
	Prod,
	Shape extends AnyTuple<AnyHasArbApply> = A["shape"],
> implements ArbApply<A>
{
	constructor(readonly apply: A) {}

	arbValue(): Arb<Prod> {
		const apply = this.apply;
		if (!(apply.fromTuple && apply.arbProductTuple)) {
			throw new Error("BaseProductShapedTuple methods must be defined");
		}

		const toTuple = apply.toTuple;
		return apply
			.arbProductTuple()
			.map(apply.fromTuple, toTuple ? (x) => toTuple(x as never) : undefined);
	}

	arbChange(opts?: ArbChangeConfig<Prod>): Arb<$D<A>> {
		const repPart = arbEmptyOrReplace(
			this.apply,
			(this.apply as A & AnyHasArbApply).getArbApply().arbValue(),
		);
		return fc.oneof(
			{ weight: opts?.droWeight ?? DRO_WEIGHT, arbitrary: repPart },
			{
				weight: 1,
				arbitrary: fc.tuple(
					...this.apply.shape.map((inner, key) =>
						inner
							.getArbApply()
							.arbChange(
								diveArbChangeConfig(
									(x) => this.apply.get(x, key as never),
									opts,
								),
							),
					),
				),
			},
		) as Arb<DeriveProductChangeTuple<Prod, Shape>>;
	}
}

BaseProductShapedTuple.prototype.arbProductTuple = function <
	Prod,
	Shape extends AnyTuple<AnyHasArbApply>,
>(this: BaseProductShapedTuple<Prod, Shape>) {
	return fc.tuple(
		...this.shape.map((inner) => inner.getArbApply().arbValue()),
	) as Arb<never>;
};

BaseProductShapedTuple.prototype.getArbApply = function <
	Shape extends AnyTuple<AnyHasArbApply>,
>(this: ATuple<Shape>) {
	return new ArbTupleShaped(this as never);
};

export class ArbUnion<
	A extends AUnion<Shape, Key>,
	Shape extends Record<Key, AnyHasArbApply>,
	Key extends keyof Shape = keyof Shape,
> implements ArbApply<A>
{
	constructor(readonly apply: A) {}
	arbValue(): Arb<$T<A>> {
		return fc.oneof(
			...Object.values(this.apply.shape).map((inner) => ({
				weight: 1,
				arbitrary: (inner as Shape[Key]).getArbApply().arbValue(),
			})),
		);
	}

	arbChange(opts?: ArbChangeConfig<$T<A>> | undefined): Arb<$D<A>> {
		const valueIsProvided = opts && "value" in opts;
		const entries: Arb<InferApplyChange<Shape[Key]>>[] = [];
		const apply = this.apply;
		const shape = apply.shape;
		const keys = apply.keys;
		for (const disc of keys) {
			if (valueIsProvided && this.apply.getDiscrimant(opts.value) !== disc) {
				continue;
			}

			const genChange = (shape[disc] as AnyHasArbApply)
				.getArbApply()
				.arbChange(diveArbChangeConfig((x) => x, opts));
			entries.push(
				fc.record(
					{
						type: fc.constant(disc),
						change: genChange,
					},
					{ noNullPrototype: true, requiredKeys: ["type", "change"] },
				),
			);
		}
		if (entries.length === 0) {
			throw new Error("AUnion.arbChange: no cases generated");
		}

		return fc.oneof(
			{
				weight: opts?.droWeight ?? DRO_WEIGHT,
				arbitrary: arbEmptyOrReplace(this.apply, this.arbValue()),
			},
			{
				weight: 1,
				arbitrary: fc.oneof(...entries),
			},
		);
	}
}

AUnion.prototype.getArbApply = function <
	Map extends Record<Key, AnyHasArbApply>,
	Key extends keyof Map = keyof Map,
>(this: AUnion<Map, Key>) {
	return new ArbUnion<AUnion<Map, Key>, Map, Key>(this);
};

export class ArbOptional<
	A extends AOptional<AInner>,
	AInner extends AnyHasArbApply & Apply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
> implements ArbApply<A>
{
	constructor(readonly apply: A) {}

	arbValue() {
		return fc.oneof(
			{ weight: 1, arbitrary: fc.constant(undefined) },
			{ weight: 4, arbitrary: this.apply.inner.getArbApply().arbValue() },
		);
	}
	arbChange(opts?: ArbChangeConfig<$T<A>>) {
		const valueIsProvided = opts && "value" in opts;
		const undefinedPart = {
			weight: 1,
			arbitrary: fc.constant(makeReplaceOnly<undefined>(undefined)),
		};
		const arbChangeInner = this.apply.inner
			.getArbApply()
			.arbChange(diveArbChangeConfig((x) => x, opts));
		return fc.oneof(undefinedPart, {
			weight: 4,
			arbitrary: valueIsProvided
				? // only replace is accepted if original value is undefined
					opts.value === undefined
					? arbChangeInner.filter((d) => this.apply.inner.isReplace(d) !== null)
					: arbChangeInner
				: arbChangeInner,
		});
	}
}

AOptional.prototype.getArbApply = function <
	AInner extends AnyHasArbApply & Apply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
>(this: AOptional<AInner>) {
	return new ArbOptional(this);
};

export class ArbMapValue<
	A extends AMapValue<AInner, T, T0, DT0>,
	AInner extends HasArbApply<T0, DT0>,
	T,
	T0 = $T<AInner>,
	DT0 = $T<AInner>,
> implements ArbApply<A>
{
	constructor(readonly apply: A) {}
	arbValue(): Arb<T> {
		return this.apply.inner
			.getArbApply()
			.arbValue()
			.map(
				(x) => this.apply.map(x),
				(x) => this.apply.unmap(x as never),
			);
	}

	arbChange(opts?: ArbChangeConfig<T>): Arb<DT0> {
		const arbA = this.apply.inner.getArbApply();
		if (opts && "value" in opts) {
			return arbA.arbChange(
				diveArbChangeConfig((x) => this.apply.unmap(x), opts),
			);
		}
		return arbA.arbChange();
	}
}

AMapValue.prototype.getArbApply = function <
	AInner extends HasArbApply<T0, DT0>,
	T,
	T0 = $T<AInner>,
	DT0 = $D<AInner>,
>(this: AMapValue<AInner, T, T0, DT0>) {
	return new ArbMapValue<typeof this, AInner, T, T0, DT0>(this);
};

export class AtomicWithGen<T> extends AAtomic<T> {
	constructor(override readonly gen: Arb<T>) {
		super();
	}
}

export const atomicWithGen = <T>(gen: Arb<T>) => new AtomicWithGen<T>(gen);

export const genValueFromApply = <A extends AnyHasArbApply>(
	apply: A,
): Arb<$T<A>> => {
	return apply.getArbApply().arbValue();
};

export const genChangeFromApply = <A extends AnyHasArbApply>(
	apply: A,
): Arb<$D<A>> => {
	return apply.getArbApply().arbChange();
};

export const genValueWithChange = <A extends AnyHasArbApply>(
	apply: A,
): Arb<{ x: $T<A>; dx: $D<A> }> => {
	const arbA = apply.getArbApply();
	return arbA
		.arbValue()
		.chain((v) =>
			fc.record(
				{
					x: fc.constant(v),
					dx: arbA.arbChange({ value: v }),
				},
				{ noNullPrototype: true },
			),
		)
		.filter(({ x, dx }) => apply.canApply(x, dx));
};

export const genValueWith2Changes = <A extends AnyHasArbApply>(
	apply: A,
): Arb<{ x: $T<A>; dx1: $D<A>; dx2: $D<A> }> => {
	const arbA = apply.getArbApply();
	return arbA
		.arbValue()
		.chain((v) =>
			fc.record({
				x: fc.constant(v),
				dx1: arbA.arbChange({ value: v }),
			}),
		)
		.filter(({ x, dx1 }) => apply.canApply(x, dx1))
		.chain(({ x, dx1 }) =>
			fc.record(
				{
					x: fc.constant(x),
					dx1: fc.constant(dx1),
					dx2: arbA.arbChange({ value: apply.apply(x, dx1) }),
				},
				{ noNullPrototype: true },
			),
		)
		.filter(({ x, dx1, dx2 }) => apply.canApply(apply.apply(x, dx1), dx2));
};
