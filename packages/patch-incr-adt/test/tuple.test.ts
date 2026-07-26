import { describe, expect, it } from "bun:test";
import * as s from "@/index";
import * as p from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import type { DeriveProductShapedChangeTuple } from "./product";

type _TupleKey0 = s.KeyOfTuple<[]>;
type _TupleKey1 = s.KeyOfTuple<["a"]>;
type _TupleKey2 = s.KeyOfTuple<["a", "b"]>;
type _TupleKey3 = s.KeyOfTuple<["a", "b", "c"]>;
type _TupleKey4 = s.KeyOfTuple<["a", "b", "c", "d"]>;

const tupNoArb = s.tuple([s.string(), s.number(), s.nullType()]);
const tup = s.tuple([p.string(), p.integer(), p.constant(null)]);

export type Tup = s.infer<typeof tupNoArb>;
export type DTup = s.inferChange<typeof tupNoArb>;

export type S1 = DeriveProductShapedChangeTuple<typeof tupNoArb.shape>;

describe("tuple", () => {
	const t1: Tup = ["abc", 2, null];
	it("should do get", () => {
		expect(tupNoArb.get(t1, "0")).toBe("abc");
	});
	it("should apply change into a valid array", () => {
		const dt1: DTup = [
			tupNoArb.shape[0].fromReplace("def"),
			tupNoArb.shape[1].fromReplace(5),
			tupNoArb.shape[2].empty,
		] as const;
		const t2: Tup = tupNoArb.apply(t1, dt1);
		// console.log(t1, t2);
		expect(Array.isArray(t2)).toBe(true);
		expect(t2).toHaveLength(3);
		expect(t2).toEqual(["def", 5, null]);
	});
	it.skip("type checking", () => {
		const _shouldTypeCheck = [tup.getArbApply()];
		const _shouldNotTypeCheck = [
			// @ts-expect-error should fail
			tupNoArb.getArbApply(),
		];
	});
	describe("properties", () => {
		testCasesPropsApply(tup);
	});
});
