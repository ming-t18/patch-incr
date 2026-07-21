import { type ARecord, record } from "@/record";
import { type ARecordMerge, type MergeShapes, merge } from "@/record/utils";
import type { $A, $D, $T, IF1, IFA, IFR } from "@/types";
import { compose1A, identity } from "../basic";
import { makeIF } from "../helpers";
import { FRecord } from "../product";

export const assignSingleton = <
	Input extends $A,
	K extends string,
	Value extends $A,
>(
	key: K,
	getValue: IF1<Input, Value> | IFA<Input, Value>,
): IF1<Input, ARecord<Record<K, Value>, K>> => {
	const output = record({ [key]: getValue.output } as Record<K, Value>);
	return makeIF(getValue.input, output, {
		evaluate: (x) =>
			({ [key as K]: getValue.evaluate(x) }) as Record<K, $T<Value>>,
		forward: (x, dx, y) => {
			const dy = getValue.forward(x, dx, y);
			if (getValue.output.isEmpty(dy)) {
				return output.empty;
			}
			return { [key as K]: dy } as Record<K, $D<Value>>;
		},
	});
};

export const composeAssign = <
	Input extends $A,
	K extends string,
	Value extends $A,
	Shape extends Record<Key, $A>,
	Key extends keyof Shape = keyof Shape,
>(
	func: IF1<Input, ARecord<Shape, Key>>,
	key: K,
	getValue: IF1<ARecord<Shape, Key>, Value> | IFA<ARecord<Shape, Key>, Value>,
): IF1<Input, ARecordMerge<Shape, Record<K, Value>, Key, K>> => {
	if (Object.hasOwn(func.output.shape, key)) {
		throw new Error("cannot reassign existing key");
	}
	type Rec1 = ARecordMerge<Shape, Record<K, Value>, Key, K>;
	const output = merge(func.output, { [key]: getValue.output } as Record<
		K,
		Value
	>) as Rec1;
	return makeIF(func.input, output, {
		evaluate: (x) => {
			const r = func.evaluate(x);
			return { ...r, [key]: getValue.evaluate(r) } as $T<Rec1>;
		},
		forward: (x, dx, y): $D<Rec1> => {
			const r = { ...y };
			const v: $T<Value> = y[key];
			delete r[key];
			const dr = func.forward(x, dx, r as $T<ARecord<Shape, Key>>);
			const dv = getValue.forward(r, dr, v);
			return { ...dr, [key]: dv };
		},
	});
};

/**
 * Helper for composing a chain of incremental functions in the form of:
 * ```
 * var1 := f1(input)
 * var2 := f2({ var1 })
 * var3 := f3({ var1, var2 })
 * var4 := f4({ var1, var2, var3 })
 * ...
 * varN := fN({ ... })
 * ```
 * The "context" is a list of variable assignments of `ARecord<Shape, Key>`.
 * To compose a new function on top of it, call `set(key, getValue)` where `key`
 * is a new variable name.
 */
export class RecordComposer<
	Input extends $A,
	Shape extends Record<Key, $A>,
	Key extends keyof Shape = keyof Shape,
> {
	constructor(readonly func: IF1<Input, ARecord<Shape, Key>>) {}

	static identity<Input extends $A, K extends string>(
		key: K,
		input: Input,
	): RecordComposer<Input, Record<K, Input>, K> {
		return new this(assignSingleton(key, identity<Input>(input)));
	}

	static single<Input extends $A, K extends string, Value extends $A>(
		key: K,
		getValue: IF1<Input, Value>,
	): RecordComposer<Input, Record<K, Value>, K> {
		return new this(assignSingleton(key, getValue));
	}

	set<K extends string, Value extends $A>(
		key: K,
		getValue: (
			inputType: ARecord<Shape, Key>,
		) => IF1<ARecord<Shape, Key>, Value> | IFA<ARecord<Shape, Key>, Value>,
	): RecordComposer<
		Input,
		MergeShapes<Shape, Record<K, Value>, Key, K>,
		Key | K
	> {
		return new RecordComposer(
			composeAssign<Input, K, Value, Shape, Key>(
				this.func,
				key,
				getValue(this.func.output),
			),
		);
	}

	build(): IF1<Input, ARecord<Shape, Key>> {
		return this.func;
	}

	get<K extends Key>(key: K): IFR<Input, Shape[K], ARecord<Shape, Key>> {
		return compose1A(this.func, new FRecord(this.func.output).get(key));
	}
}
