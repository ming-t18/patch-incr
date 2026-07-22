import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import { atomicWithGen } from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
export const recordOpt = s.optional(
	s.record({
		a: s.boolean(),
		b: s.string(),
	}),
);
export const recordOptWithArb = s.optional(
	s.record({
		a: atomicWithGen(fc.boolean()),
		b: atomicWithGen(fc.string()),
	}),
);

// Should type check
const _undef: s.infer<typeof recordOpt> = undefined;

const defined: s.infer<typeof recordOpt> = { a: false, b: "test" };
describe("optional", () => {
	it.skip("type checking for optional arb", () => {
		const _shouldNotTypeCheck = [
			// @ts-expect-error must fail type constraint
			recordOpt.getArbApply(),
		];
		const _shouldTypeCheck = [recordOptWithArb.getArbApply()];
	});
	it("should replace defined to undefined", () => {
		expect(recordOpt.apply(defined, recordOpt.toUndefined)).toBeUndefined();
	});
	it("should combine replaces", () => {
		expect(
			recordOpt.combine(recordOpt.fromReplace(defined), recordOpt.toUndefined),
		).toEqual(recordOpt.toUndefined);
	});
	it("should combine inner changes", () => {
		const d1 = recordOpt.inner.fromMap({
			a: recordOpt.inner.shape.a.fromReplace(true),
		});
		const d2 = recordOpt.inner.fromMap({
			b: recordOpt.inner.shape.b.fromReplace("x"),
		});
		expect(recordOpt.combine(d1, d2)).toEqual(recordOpt.inner.combine(d1, d2));
	});
	it("should replace from undefined to defined", () => {
		expect(recordOpt.apply(undefined, recordOpt.fromReplace(defined))).toEqual(
			defined,
		);
	});

	describe("property tests", () => {
		testCasesPropsApply(recordOptWithArb);
	});
});
