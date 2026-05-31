import * as s from "@/index";

export const union1 = s.union(
	{
		left: s.string(),
		right: s.number(),
	},
	(x) => (typeof x === "string" ? "left" : "right"),
);

describe("union", () => {
	it("test 1", () => {
		const v = "abcdef";
		const d1: s.UnionChangeEntry<"left", s.DRO<string>> = {
			type: "left" as const,
			change: s.makeReplaceOnly<string>("xyz"),
		};
		expect(union1.apply(v, d1)).toBe("xyz");
		expect(() => union1.apply(123, d1)).toThrow();
	});
});
