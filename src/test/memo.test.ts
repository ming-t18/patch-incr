import { describe, expect, it, spyOn } from "bun:test";
import type { InferApplyType } from "../algebra";
import { bind } from "../incr/bind";
import { atomicFunc } from "../incr/builder";
import { compose } from "../incr/compose";
import { filter, flatMap } from "../incr/list";
import { memoInterm, memoIntermR } from "../incr/memoPair";
import { PatchOp, type Patches } from "../incr/patch";
import { access } from "../incr/struct/access";
import { record } from "../incr/struct/record";
import type { InferIFOutput } from "../incr/types";
import * as ps from "../patchSchema";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const valueSchema = ps.atomic<number>();
const rs = ps.record({ value: valueSchema });
const arraySchema = ps.array(rs);
const rv = (index: number, value: number) =>
	arraySchema.liftIndex(
		index,
		rs.liftKey("value", valueSchema.fromReplace(value)),
	);

const x = [
	{ value: 1 },
	{ value: 5 },
	{ value: 3 },
	{ value: 0 },
	{ value: 9 },
];
const dx = rv(2, 0);
const yExpected = [{ value: 5 }, { value: 3 }, { value: 9 }];

type Array = InferApplyType<typeof arraySchema>;
const dyExpected: Patches<Array> = [{ op: PatchOp.Remove, path: [1] }];
const filterFunc = filter((x: { value: number }) => x.value > 2);

describe("memoInterm", () => {
	it("should call WeakMap set and get", () => {
		const map = new WeakMap<Array, [Array, number[]]>();
		const spySet = spyOn(map, "set");
		const spyGet = spyOn(map, "get");
		const f = memoInterm(filterFunc, map);
		const y = f.invoke(x);
		expect(spySet).toHaveBeenCalledWith(x, expect.anything());
		expect(y).toStrictEqual(yExpected);
		const dy = f.forward(x, dx, y);
		expect(spyGet).toHaveBeenCalledWith(x);
		expect(dy).toStrictEqual(dyExpected);
	});

	describe("complex function composition example", () => {
		const arbEntry = gp.record({
			a: gp.integer({ min: 0, max: 5 }),
			b: gp.integer({ min: 0, max: 5 }),
		});
		type Entry = gp.InferArbValue<typeof arbEntry>;
		const toRecord = record({
			a: access<number, "a", Entry>("a"),
			array: atomicFunc(({ a, b }: Entry) =>
				Array(a + b)
					.fill(null)
					.map((_, i) => 1000 + i),
			),
		});
		type ToRecord = InferIFOutput<typeof toRecord>;
		const composed = compose(
			toRecord,
			atomicFunc(({ a, array }: ToRecord) => array.filter((x) => x > a)),
		);
		const memoComposed = memoInterm(composed);
		const fm = flatMap(memoComposed);
		const fm1 = memoInterm(fm, undefined, true);

		propsForIF(it, gp.array(arbEntry, { maxLength: 5 }), () => fm1);
	});
});

describe("memoIntermR", () => {
	it("should call WeakMap set and get", () => {
		const map = new WeakMap<Array, [Array, number[]]>();
		const spySet = spyOn(map, "set");
		const spyGet = spyOn(map, "get");
		const f = memoIntermR(filterFunc, map);
		const y = f.invoke(x);
		expect(spySet).toHaveBeenCalledWith(y, expect.anything());
		expect(y).toStrictEqual(yExpected);
		const dy = f.forward(x, dx, y);
		expect(spyGet).toHaveBeenCalledWith(y);
		expect(dy).toStrictEqual(dyExpected);
	});
});
