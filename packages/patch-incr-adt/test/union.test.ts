import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { FUnion } from "@/funcs";
import * as s from "@/index";
import {
	atomicWithGen,
	genChangeFromApply,
	genValueFromApply,
} from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIdentity, testCasesIFA } from "./fastCheck/testPropsIF.test";

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
		const dl: s.inferChange<typeof union1> = {
			type: "left",
			change: union1.shape.left.fromReplace("test"),
		};
		const dr: s.inferChange<typeof union1> = {
			type: "right",
			change: union1.shape.right.fromReplace(1),
		};

		it("canApply on matched case should be true", () => {
			expect(union1.canApply("abc", dl)).toBe(true);
			expect(union1.canApply(-1, dr)).toBe(true);
		});

		it("canApply on mismatched case should be false", () => {
			expect(union1.canApply(1, dl)).toBe(false);
			expect(union1.canApply("test", dr)).toBe(false);
		});

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
});

describe("union funcs", () => {
	const f1 = new FUnion(union1);
	const union2 = s.union(
		{
			rec: s.record({ a: atomicWithGen(fc.string()) }),
			int: atomicWithGen(fc.integer()),
		},
		(x) => (typeof x === "number" ? "int" : "rec"),
	);
	const f2 = new FUnion(union2);
	describe("union1", () => {
		describe("introCondA(...) with elimCase", () => {
			const introElim = f1.introCondA(union1.getDiscrimant, {
				left: f1.elimCase("left"),
				right: f1.elimCase("right"),
			});
			testCasesIFA(introElim);
			describe("is identity", () => {
				testCasesIdentity(introElim);
			});
		});
		describe("introCase('left')", () => {
			testCasesIFA(f1.introCase("left"));
		});
		describe("introCase('right')", () => {
			testCasesIFA(f1.introCase("right"));
		});
	});

	describe("union2", () => {
		describe("introCondA(...) with elimCase", () => {
			const introElim = f2.introCondA(union2.getDiscrimant, {
				rec: f2.elimCase("rec"),
				int: f2.elimCase("int"),
			});
			testCasesIFA(introElim);
			describe("is identity", () => {
				testCasesIdentity(introElim);
			});
		});
		describe("introCase('rec')", () => {
			testCasesIFA(f2.introCase("rec"));
		});
		describe("introCase('int')", () => {
			testCasesIFA(f2.introCase("int"));
		});
	});
});
