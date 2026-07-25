import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import { atomicWithGen, genValueWithChange } from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import type { AnyHasArbApply } from "./props";

const testPropsMapValue = <A extends AnyHasArbApply, T>(
	apply: s.AMapValue<A, T>,
) => {
	const { inner, map, unmap } = apply;

	it("map is invertible with unmap", () => {
		fc.assert(
			fc.property(apply.getArbApply().arbValue(0), (xMap) => {
				expect(map(unmap(xMap))).toEqual(xMap);
			}),
		);
	});
	it("same as inner apply", () => {
		fc.assert(
			fc.property(genValueWithChange(apply), ({ x: xMap, dx }) => {
				expect(apply.apply(xMap, dx)).toEqual(
					map(inner.apply(unmap(xMap), dx)),
				);
			}),
		);
	});

	testCasesPropsApply(apply);
};

describe("singleKey", () => {
	describe("constant", () => {
		testPropsMapValue(s.singleKey("nullValue", s.constant(null, null)));
	});

	describe("integer", () => {
		const integer = atomicWithGen(fc.integer());
		testPropsMapValue(s.singleKey("value", integer));
	});

	describe("record", () => {
		const integer = s.record({
			int: atomicWithGen(fc.integer()),
			bool: atomicWithGen(fc.boolean()),
		});
		testPropsMapValue(s.singleKey("value", integer));
	});

	describe("union", () => {
		const integer = s.union(
			{
				int: atomicWithGen(fc.integer()),
				bool: atomicWithGen(fc.boolean()),
			},
			(x) => (typeof x === "number" ? "int" : "bool"),
		);
		testPropsMapValue(s.singleKey("value", integer));
	});
});
