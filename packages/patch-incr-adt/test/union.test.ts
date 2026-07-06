import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import {
	atomicWithGen,
	genChangeFromApply,
	genValueFromApply,
} from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

export const singleton = s.union(
	{
		single: atomicWithGen(fc.string()),
	},
	(_) => "single",
);

export const nestedSingleton = s.union(
	{
		single1: singleton,
	},
	(_) => "single1",
);

export const union1 = s.union(
	{
		left: atomicWithGen(fc.string()),
		right: atomicWithGen(fc.integer()),
	},
	(x) => (typeof x === "string" ? "left" : "right"),
);

export const union1NoGen = s.union(
	{
		left: s.string(),
		right: s.number(),
	},
	(x) => (typeof x === "string" ? "left" : "right"),
);

export const union1NoGenFailOnRight = s.union(
	{
		left: atomicWithGen(fc.string()),
		right: s.number(),
	},
	(x) => (typeof x === "string" ? "left" : "right"),
);

describe("union", () => {
	describe("singleton", () => {
		testCasesPropsApply(singleton);
	});
	describe("nested singleton", () => {
		testCasesPropsApply(nestedSingleton);
	});
	describe("string|number", () => {
		it.skip("type checking on arb", () => {
			const _shouldFailTypeCheck = [
				// @ts-expect-error arbValue must fail type constraint
				union1NoGen.arbValue(),
				// @ts-expect-error arbChange must fail type constraint
				union1NoGen.arbChange(),
				// @ts-expect-error error message should mention "right" is causing the problem
				union1NoGenFailOnRight.arbChange(),
			];
			const _shouldPassTypeCheck = [union1.arbValue(), union1.arbChange()];
		});
		it("applying any valid patch returns a value of correct type", () => {
			fc.assert(
				fc.property(
					genValueFromApply(union1),
					genChangeFromApply(union1),
					(x, d) => {
						fc.pre(union1.canApply(x, d));
						const res = union1.apply(x, d);
						return typeof res === "number" || typeof res === "string";
					},
				),
			);
		});
		testCasesPropsApply(union1);
	});
	it.skip("test 1", () => {
		const v = "abcdef";
		const d1: s.UnionChangeEntry<"left", s.DRO<string>> = {
			type: "left" as const,
			change: s.makeReplaceOnly<string>("xyz"),
		};
		expect(union1.apply(v, d1)).toBe("xyz");
		expect(() => union1.apply(123, d1)).toThrow();
	});
});
