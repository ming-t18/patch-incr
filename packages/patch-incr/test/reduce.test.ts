import { propsForIF } from "@test/props.test";
import { objectFromEntriesAlgebra } from "@/algebra/incReduce";
import { sumBigint, sumWith } from "@/algebra/reduceAlgebra";
import { reduce, reduceInc } from "@/builder/array/reduce";
import * as gp from "./helpers/genPatched.test";

const arbIntegers = gp.array(
	gp.record({
		value: gp.integer({ min: 0, max: 10 }),
	}),
	{ maxLength: 10 },
);

const arbWithBigint = gp.array(gp.bigInt(), { maxLength: 20 });

const arbValue = gp.record({
	a: gp.integer({ min: 0, max: 10 }),
	b: gp.array(gp.string(), { maxLength: 5 }),
});

const arbEntries = gp.entriesArray(
	// empty string can't be a valid key
	gp.string({ minLength: 1, maxLength: 3, unit: "grapheme-ascii" }),
	arbValue,
	{ maxLength: 10 },
);

describe("reduce", () => {
	describe("sum number", () => {
		propsForIF(arbIntegers, () => reduce(sumWith((x) => x.value)));
	});
	describe("sum bigint", () => {
		propsForIF(arbWithBigint, () => reduce(sumBigint()));
	});
	describe("merge maps non-patching", () => {
		propsForIF(arbEntries, () =>
			reduce(objectFromEntriesAlgebra<string, { a: number; b: string[] }>({})),
		);
	});
});

describe("reduceInc", () => {
	describe("merge maps patching", () => {
		propsForIF(arbEntries, () =>
			reduceInc(
				objectFromEntriesAlgebra<string, { a: number; b: string[] }>({}),
			),
		);
	});
});
