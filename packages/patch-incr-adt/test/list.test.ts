/** biome-ignore-all lint/style/noNonNullAssertion: for testing */

import { describe, expect, it, test } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import { FList } from "@/list/func";
import * as lp from "@/list/prod";
import * as p from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIFA } from "./fastCheck/testPropsIF.test";

const listProdString = lp.list(s.string());
const listProdStringGen = lp.list(p.string());
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

	test.skip("type inference for getArbApply", () => {
		const _1 = listProdString.getArbApply satisfies undefined;
		const _2 = listProdStringGen.getArbApply satisfies () => unknown;
	});

	describe("apply props", () => {
		testCasesPropsApply(listProdStringGen);
	});
});

describe("filter", () => {
	describe("of string", () => {
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

		const getIndexFirstChange = <T extends s.$A>(
			dx: s.$D<s.AList<T>>,
		): number => {
			if (s.isDRO(dx)) {
				return dx === null ? Infinity : 0;
			}
			if (dx.type === "nil") {
				return 0;
			}
			const dCons = dx.change;
			if (s.isDRO(dCons)) {
				return 0;
			}
			if (dCons.head) {
				return 0;
			}
			if (!dCons.tail) {
				return Infinity;
			}
			return 1 + getIndexFirstChange(dCons.tail);
		};

		const getDepth = <T extends s.$A>(dx: s.$D<s.AList<T>>): number => {
			if (s.isDRO(dx)) {
				return dx === null ? Infinity : 0;
			}
			if (dx.type === "nil") {
				return 0;
			}
			const dCons = dx.change;
			if (s.isDRO(dCons)) {
				return 0;
			}
			return dCons.tail ? 1 + getDepth(dCons.tail) : 1;
		};

		const noTailReplaces = <T extends s.$A>(dx: s.$D<s.AList<T>>): boolean => {
			if (s.isDRO(dx)) {
				return dx === null;
			}
			if (dx.type === "nil") {
				return true;
			}
			const dCons = dx.change;
			if (s.isDRO(dCons)) {
				return dCons === null;
			}
			return dCons.tail == null || noTailReplaces(dCons.tail);
		};

		describe("filter false", () => {
			const f = new FList(listProdStringGen).filter(() => false);
			testCasesIFA(f);

			test("should always return empty change", () => {
				fc.assert(
					fc.property(p.genValueWithChange(f.input), ({ x, dx }) => {
						fc.pre(noTailReplaces(dx));
						expect(f.forward(x, dx)).toEqual(null);
					}),
				);
			});
		});

		describe("filter true", () => {
			const f = new FList(listProdStringGen).filter(() => true);
			testCasesIFA(f);

			test("should match change depth", () => {
				fc.assert(
					fc.property(p.genValueWithChange(f.input), ({ x, dx }) => {
						fc.pre(noTailReplaces(dx));
						const actual = f.output.trim(f.forward(x, dx));
						const expected = f.input.trim(dx);
						return getDepth(actual) === getDepth(expected);
					}),
				);
			});
		});

		describe("filter by length", () => {
			const f = new FList(listProdStringGen).filter((x) => x.length < 5);
			testCasesIFA(f);

			test("index of first change", () => {
				fc.assert(
					fc.property(p.genValueWithChange(f.input), ({ x, dx }) => {
						fc.pre(noTailReplaces(dx));
						const actual = f.output.trim(f.forward(x, dx));
						const expected = f.input.trim(dx);
						return getIndexFirstChange(actual) >= getIndexFirstChange(expected);
					}),
				);
			});
		});
	});

	describe("of pair", () => {
		const listOfPair = lp.list(s.Pair.pair(p.string(), p.boolean()));
		testCasesIFA(new FList(listOfPair).filter(([_, b]) => !b));
		testCasesIFA(
			new FList(listOfPair).filter(([s, b]) => !b === (s.length % 2 === 0)),
		);
	});

	describe("of either", () => {
		const listOfPair = lp.list(s.Either.either(p.string(), p.boolean()));
		testCasesIFA(
			new FList(listOfPair).filter((x) => String(x).length % 2 === 0),
		);
		testCasesIFA(new FList(listOfPair).filter((x) => "left" in x));
	});
});
