import { propsForIF } from "@test/props.test";
import { sumBigint, sumWith } from "@/algebra/reduceAlgebra";
import { reduce } from "@/builder/array/reduce";
import * as gp from "./helpers/genPatched.test";

const arb = gp.array(
	gp.record({
		value: gp.integer({ min: 0, max: 10 }),
	}),
	{ maxLength: 20 },
);

const arbWithBigint = gp.array(gp.bigInt(), { maxLength: 20 });

describe("reduce", () => {
	describe("sum number", () => {
		propsForIF(it, arb, () => reduce(sumWith((x) => x.value)));
	});
	describe("sum bigint", () => {
		propsForIF(it, arbWithBigint, () => reduce(sumBigint()));
	});
});
