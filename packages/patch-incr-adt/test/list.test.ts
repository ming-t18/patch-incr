/** biome-ignore-all lint/style/noNonNullAssertion: for testing */

import { describe, expect, it } from "bun:test";
import * as s from "@/index";
import { FList } from "@/list/func";
import * as lp from "@/list/prod";

const listProdString = lp.list(s.string());
const cons1: s.infer<typeof listProdString> = lp.cons(
	"abc",
	lp.cons("def", lp.cons("ghi", lp.cons("mno"))),
);
const dProd1: s.inferChange<typeof listProdString> = {
	type: "cons",
	change: {
		head: s.makeReplaceOnly("pqr"),
		tail: {
			type: "cons",
			change: {
				// head: s.makeReplaceOnly("stu"),
				tail: listProdString.fromReplace(lp.cons("aaa")),
			},
		},
	},
};

describe("list", () => {
	it("to array", () => {
		expect([...cons1!]).toEqual(["abc", "def", "ghi", "mno"]);
		expect([...listProdString.apply(cons1, dProd1)!]).toEqual([
			"pqr",
			"def",
			"aaa",
		]);
	});
});

describe("filter", () => {
	it("evaluate, no net change", () => {
		const fList = new FList(listProdString);
		// { list[1] = 'def' }
		const dx: s.inferChange<typeof listProdString> = {
			type: "cons",
			change: {
				tail: {
					type: "cons",
					change: {
						head: s.makeReplaceOnly("def"),
					},
				},
			},
		};
		const filterFn = fList.filter((_x) => true);
		const filtered = filterFn.evaluate(cons1);
		expect(filtered!.toArray()).toEqual(["abc", "def", "ghi", "mno"]);
		const dList = filterFn.forward(cons1, dx);
		expect(dList).toEqual(null);
	});

	it("remains filtered out", () => {
		const fList = new FList(listProdString);
		// { list[1] = 'def' }
		const dx: s.inferChange<typeof listProdString> = {
			type: "cons",
			change: {
				tail: {
					type: "cons",
					change: {
						head: s.makeReplaceOnly("-"),
					},
				},
			},
		};
		const filterFn = fList.filter((x) => !(x === "def" || x === "-"));
		const filtered = filterFn.evaluate(cons1);
		expect(filtered!.toArray()).toEqual(["abc", "ghi", "mno"]);
		const dList = filterFn.forward(cons1, dx);
		expect(dList).toEqual(null);
	});

	it("change to filtered out", () => {
		const fList = new FList(listProdString);
		// { list[1] = '-' }
		const dx: s.inferChange<typeof listProdString> = {
			type: "cons",
			change: {
				tail: {
					type: "cons",
					change: {
						head: s.makeReplaceOnly("-"),
					},
				},
			},
		};
		const filterFn = fList.filter((x) => x !== "def" && x !== "123");
		const filtered = filterFn.evaluate(cons1);
		expect(filtered?.toArray()).toEqual(["abc", "ghi", "mno"]);
		const dList = filterFn.forward(cons1, dx);
		expect(dList).toEqual({
			type: "cons",
			change: { head: null, tail: expect.anything() },
		});
	});
});
