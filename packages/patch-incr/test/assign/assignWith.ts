import { atomicFunc, constant, identity } from "@/builder";
import { record, template } from "@/builder/struct";
import { assign, assignWith } from "@/builder/struct/assign";
import { entries, fromEntries, keys } from "@/builder/struct/entries";
import { merge } from "@/builder/struct/merge";
import type { AnyIF } from "@/types";
import * as gp from "../helpers/genPatched.test";
import { propsForIF } from "../helpers/props.test";

const arbPair = gp.tuple(
	gp.integer({ min: -10, max: 10 }),
	gp.integer({ min: -10, max: 10 }),
);
const arbSimpleNested = gp.record({
	a: gp.record({
		b: gp.integer({ min: -10, max: 10 }),
	}),
});
type Nested = gp.InferArbValue<typeof arbSimpleNested>;

describe("assignWith", () => {
	describe("pair", () => {
		const assignOnPair = assignWith([
			{
				path: [1],
				getValue: atomicFunc(([x]: [number, number]) => -x) as AnyIF,
			},
		]);
		propsForIF(it, arbPair, () => assignOnPair);
	});
	describe("simple nested", () => {
		const assignOnSimpleNested = assignWith([
			{
				path: ["a", "c"],
				getValue: atomicFunc((x: Nested) => -x.a.b) as AnyIF,
			},
		]);
		propsForIF(it, arbSimpleNested, () => assignOnSimpleNested);
	});
});
