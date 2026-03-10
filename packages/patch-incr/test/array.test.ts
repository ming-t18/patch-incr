import { last, length } from "@/builder/array";
import { indexed } from "@/builder/array/mapIndexed";
import { PatchBuilder } from "@/patch";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const arb = gp.array(
	gp.record({
		a: gp.integer({ min: 0, max: 10 }),
		b: gp.boolean(),
	}),
	{ maxLength: 5 },
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
	it.skip("indexed example, add", () => {
		const x = [
			{
				a: 2,
				b: false,
			},
			// {
			// 	a: 1,
			// 	b: false,
			// },
			// {
			// 	a: 3,
			// 	b: false,
			// },
		];

		// const dx = PatchBuilder.empty().remove([0]).build();
		const dx = PatchBuilder.empty().add(["-"], { a: 4, b: true }).build();
		const f = indexed();
		const y = f.evaluate(x);
		const dy = f.forward(x, dx, y);
		console.log(y);
		console.log(dy);
	});

	propsForIF(it, arb, indexed);
});
