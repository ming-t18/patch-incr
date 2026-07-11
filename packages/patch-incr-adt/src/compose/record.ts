import { number, string } from "@/atomic";
import { constant, identity } from "@/funcs/basic";
import { type ARecord, record } from "@/record";
import { type ARecordMerge, type MergeShapes, merge } from "@/record/utils";
import type { AnyApply } from "@/types";
import type { $A, $D, $T } from "@/types/abbr";
import type { IF, IFA } from "@/types/func";

export class IFRC<
	Input extends $A,
	Output extends ARecord<Shape, Key>,
	Shape extends Record<Key, AnyApply> = Output["shape"],
	Key extends keyof Shape = keyof Shape,
> implements IF<Input, Output>
{
	constructor(
		readonly input: Input,
		readonly output: Output,
		readonly funcs: [string, IF<AnyApply, AnyApply>][],
	) {}

	static create<Input extends AnyApply, K1 extends string>(
		key1: K1,
		input: Input,
	): IFRC<Input, ARecord<Record<K1, Input>>> {
		return new IFRC(input, record({ [key1]: input } as Record<K1, Input>), [
			[key1, identity(input)],
		]);
	}

	add<K1 extends string, V extends AnyApply>(
		key: K1,
		fn: (m: Output) => IF<Output, V> | IFA<Output, V>,
	): IFRC<
		Input,
		ARecordMerge<Shape, Record<K1, V>, Key, K1>,
		MergeShapes<Shape, Record<K1, V>, Key, K1>,
		Key | K1
	> {
		if (Object.hasOwn(this.output.shape, key)) {
			throw new TypeError("cannot overwrite key");
		}

		const f1 = fn(this.output);
		return new IFRC(
			this.input,
			// @ts-expect-error Can't be checked
			merge(this.output, { [key as K1]: f1.output }),
			[...this.funcs, [key, f1]],
		);
	}

	evaluate(x: $T<Input>): $T<Output> {
		let acc: $T<$A> = x;
		let first = true;
		for (const [k, f] of this.funcs) {
			acc = first ? { [k]: f.evaluate(acc) } : { ...acc, [k]: f.evaluate(acc) };
			first = false;
		}
		return acc;
	}

	forward(_x: $T<Input>, dx: $D<Input>, y: $T<Output>): $D<Output> {
		if (this.input.isEmpty(dx)) {
			return this.output.empty;
		}

		let dAcc: $D<$A> = dx;
		let first = true;
		for (const [k, f] of this.funcs) {
			const k1 = k as Key;
			dAcc = first
				? { [k]: f.forward(y, dAcc, y[k1]) }
				: { ...dAcc, [k]: f.forward(y, dAcc, y[k1]) };
			first = false;
		}
		return dAcc;
	}
}

const _test1 = () => {
	const _f = IFRC.create("str", string())
		.add("abc", (m) => constant(m, number(), 2))
		.add("def", (m) => constant(m, number(), 4))
		.add("ghi", (m) => constant(m, string(), "test"))
		.add("id1", (m) => identity(m));
};
