import * as s from "@/index";
import type { DeriveProductShapedChangeTuple } from "./product";

type _TupleKey0 = s.KeyOfTuple<[]>;
type _TupleKey1 = s.KeyOfTuple<["a"]>;
type _TupleKey2 = s.KeyOfTuple<["a", "b"]>;
type _TupleKey3 = s.KeyOfTuple<["a", "b", "c"]>;
type _TupleKey4 = s.KeyOfTuple<["a", "b", "c", "d"]>;

const tup = s.tuple([s.string(), s.number(), s.nullType()]);

export type Tup = s.infer<typeof tup>;
export type DTup = s.inferChange<typeof tup>;

export type S1 = DeriveProductShapedChangeTuple<typeof tup.shape>;

describe("tuple", () => {
	const t1: Tup = ["abc", 2, null];
	it("should do get", () => {
		expect(tup.get(t1, "0")).toBe("abc");
	});
	it("should apply change into a valid array", () => {
		const dt1: DTup = [
			tup.shape[0].fromReplace("def"),
			tup.shape[1].fromReplace(5),
			tup.shape[2].empty,
		] as const;
		const t2: Tup = tup.apply(t1, dt1);
		// console.log(t1, t2);
		expect(Array.isArray(t2)).toBe(true);
		expect(t2).toHaveLength(3);
		expect(t2).toEqual(["def", 5, null]);
	});
});
