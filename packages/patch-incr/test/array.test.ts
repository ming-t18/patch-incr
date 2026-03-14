import { last, length } from "@/builder/array";
import { indexed } from "@/builder/array/mapIndexed";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const arb = gp.array(
	gp.record({
		a: gp.integer({ min: 0, max: 10 }),
		b: gp.boolean(),
	}),
	{ maxLength: 20 },
);

describe("length", () => {
	describe("evaluate", () => {
		expect(length().evaluate([])).toBe(0);
		expect(length().evaluate([1, 2, 3])).toBe(3);
	});
	propsForIF(it, arb, length);
});

describe("last", () => {
	describe("evaluate", () => {
		expect(last().evaluate([])).toBeUndefined();
		expect(last().evaluate([1, 2, 3])).toBe(3);
	});

	propsForIF(it, arb, last);
});

describe("indexed", () => {
	// TODO failing with patches related to '-'
	propsForIF(it, arb, indexed);
});
