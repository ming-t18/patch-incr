import * as s from "@/index";

const tup = s.tuple([s.string(), s.number(), s.nullType] as const);

export type Tup = s.infer<typeof tup>;
export type DTup = s.inferChange<typeof tup>;

describe("tuple", () => {
	const t1: Tup = ["abc", 2, null];
	// it("should do get", () => {
	// 	expect(tup.get(t1, 0)).toBe("abc");
	// });
	it("should apply change into a valid array", () => {
		const dt1: DTup = [
			tup.shape[0].fromReplace("def"),
			tup.shape[1].fromReplace(5),
			tup.shape[2].empty,
		];
		const t2: Tup = tup.apply(t1, dt1);
		// console.log(t1, t2);
		expect(Array.isArray(t2)).toBe(true);
		expect(t2).toHaveLength(3);
		expect(t2).toEqual(["def", 5, null]);
	});
});
