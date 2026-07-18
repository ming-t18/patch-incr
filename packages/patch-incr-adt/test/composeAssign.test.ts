import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import * as f from "@/funcs";
import * as s from "@/index";
import { atomicWithGen } from "@/props";
import { testCasesIF } from "./fastCheck/testPropsIF.test";

const num = atomicWithGen(fc.bigInt({ min: -5n, max: 5n }));
// const sq = f.atomicFunc(num, num, (x) => x * x);
const xy = s.record({ x: num, y: num });

const nested = f.AssignComposer.identity("x", num)
	.set("y", f.identity)
	.set("z", f.identity)
	.set("w", f.identity)
	.build();

const pyth = new f.AssignComposer(f.toIF1(f.identity(xy)))
	.set("xsq", (r) => f.atomicFunc(r, num, ({ x }) => x * x))
	.set("ysq", (r) => f.atomicFunc(r, num, ({ y }) => y * y))
	.set("pyth", (r) => f.atomicFunc(r, num, ({ xsq, ysq }) => xsq + ysq))
	.build();

describe("nested", () => {
	test("key ordering is based on the order of method calls", () => {
		expect(Object.keys(nested.evaluate(1n))).toEqual(["x", "y", "z", "w"]);
	});
	test("evaluate", () => {
		expect(nested.evaluate(1n)).toEqual({
			x: 1n,
			y: {
				x: 1n,
			},
			z: {
				x: 1n,
				y: {
					x: 1n,
				},
			},
			w: {
				x: 1n,
				y: {
					x: 1n,
				},
				z: {
					x: 1n,
					y: {
						x: 1n,
					},
				},
			},
		});
	});
	testCasesIF(nested);
});

describe("pyth", () => {
	test("evaluate", () => {
		expect(pyth.evaluate({ x: 2n, y: 3n })).toEqual({
			x: 2n,
			y: 3n,
			xsq: 4n,
			ysq: 9n,
			pyth: 13n,
		});
	});
	testCasesIF(pyth);
});
