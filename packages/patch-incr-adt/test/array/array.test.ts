// biome-ignore-all lint/style/noNonNullAssertion: for checked array access
import { describe, expect, it, test } from "bun:test";
import fc from "fast-check";
import {
	MapResult,
	mapIndex,
	type ParSpliceEntries,
	type ParSpliceEntry,
	SpliceTable,
	unmapIndex,
} from "@/array/splice";
import * as s from "@/index";
import * as p from "@/props";

function toEntries<T, DT>(
	xs: (
		| number
		| { _dIndex: number; lenToRemove: number; replace: T[] }
		| { _dIndex: number; change: DT }
	)[],
): ParSpliceEntries<T, DT> {
	const res: ParSpliceEntries<T, DT> = [];
	let i = 0;
	for (const e of xs) {
		if (typeof e === "number") {
			i += e;
		} else if ("change" in e) {
			res.push({
				index: i,
				change: e.change,
			});
			i += 1;
		} else {
			res.push({
				index: i,
				lenToRemove: e.lenToRemove,
				replace: e.replace,
			});
			i += e.lenToRemove;
		}
	}
	return res;
}

function arbDeleting<T, DT>(
	arbChange: fc.Arbitrary<DT>,
): fc.Arbitrary<ParSpliceEntries<T, DT>> {
	return fc
		.array(
			fc.oneof(
				fc.integer({ min: 1, max: 5 }),
				fc.integer({ min: 1, max: 5 }).chain((len) =>
					fc.record({
						_dIndex: fc.integer({ min: 0, max: 5 }),
						lenToRemove: fc.constant(len),
						replace: fc.constant([] as T[]),
					}),
				),
				fc.record({
					_dIndex: fc.integer({ min: 0, max: 5 }),
					change: arbChange,
				}),
			),
		)
		.map((xs) => toEntries(xs));
}

function arbAdding<T, DT>(
	arbValue: fc.Arbitrary<T>,
	arbChange: fc.Arbitrary<DT>,
): fc.Arbitrary<ParSpliceEntries<T, DT>> {
	return fc
		.array(
			fc.oneof(
				fc.integer({ min: 1, max: 5 }),
				fc.integer({ min: 1, max: 5 }).chain((len) =>
					fc.record({
						_dIndex: fc.integer({ min: 0, max: 5 }),
						lenToRemove: fc.constant(0),
						replace: fc.array(arbValue, { minLength: len, maxLength: len }),
					}),
				),
				fc.record({
					_dIndex: fc.integer({ min: 0, max: 5 }),
					change: arbChange,
				}),
			),
		)
		.map((xs) => toEntries(xs));
}

function arbNonShifting<T, DT>(
	arbValue: fc.Arbitrary<T>,
	arbChange: fc.Arbitrary<DT>,
): fc.Arbitrary<ParSpliceEntries<T, DT>> {
	return fc
		.array(
			fc.oneof(
				fc.integer({ min: 1, max: 5 }),
				fc.integer({ min: 1, max: 5 }).chain((len) =>
					fc.record({
						_dIndex: fc.integer({ min: 0, max: 5 }),
						lenToRemove: fc.constant(len),
						replace: fc.array(arbValue, { minLength: len, maxLength: len }),
					}),
				),
				fc.record({
					_dIndex: fc.integer({ min: 0, max: 5 }),
					change: arbChange,
				}),
			),
		)
		.map((xs) => toEntries(xs));
}

describe("mapIndex", () => {
	describe("empty splice table", () => {
		it("should have unchanged index", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 10 }),
					(i) => mapIndex([], i).index === i,
				),
			);
		});

		it("should have null entry ", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 10 }),
					(i) => mapIndex([], i).entry === null,
				),
			);
		});

		it("should have Unchanged result", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 10 }),
					(i) => mapIndex([], i).result === MapResult.Unchanged,
				),
			);
		});
	});

	describe("deleting splices (replace.length = 0)", () => {
		it("should return lower indexes, example 1", () => {
			// [0, 1, 2, 3, 4]
			// [0, ^  ^, 1, 2]
			const entry0: ParSpliceEntry<never> = {
				index: 1,
				lenToRemove: 2,
				replace: [],
			};
			const entry0m = {
				i: 1,
				j: 1,
				di: 2,
				dj: 0,
				replace: [],
			};
			expect([0, 1, 2, 3, 4].map((i) => mapIndex([entry0], i))).toEqual([
				{ index: 0, entry: null, result: MapResult.Unchanged },
				{ index: 1, entry: entry0m, result: MapResult.Removed },
				{ index: 1, entry: entry0m, result: MapResult.Removed },
				{ index: 1, entry: null, result: MapResult.Unchanged },
				{ index: 2, entry: null, result: MapResult.Unchanged },
			]);
		});
		it("should return lower indexes, specific examples", () => {
			const entries2: ParSpliceEntries<never, never> = [
				{
					index: 1,
					lenToRemove: 2,
					replace: [],
				},
				{
					index: 5,
					lenToRemove: 1,
					replace: [],
				},
			];
			const entry0m = {
				i: 1,
				di: 2,
				j: 1,
				dj: 0,
				replace: [],
			};
			const entry1m = {
				i: 5,
				di: 1,
				j: 3,
				dj: 0,
				replace: [],
			};

			// [0, 1, 2, 3, 4, 5, 6, 7, 8]
			// [0, ^  ^, 1, 2, ^, 3, 4, 5]
			expect(
				[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => mapIndex(entries2, i)),
			).toEqual([
				{ index: 0, entry: null, result: MapResult.Unchanged },
				{ index: 1, entry: entry0m, result: MapResult.Removed },
				{ index: 1, entry: entry0m, result: MapResult.Removed },
				{
					index: 1,
					entry: null,
					result: MapResult.Unchanged,
				},
				{
					index: 2,
					entry: null,
					result: MapResult.Unchanged,
				},
				{ index: 3, entry: entry1m, result: MapResult.Removed },
				{
					index: 3,
					entry: null,
					result: MapResult.Unchanged,
				},
				{
					index: 4,
					entry: null,
					result: MapResult.Unchanged,
				},
				{
					index: 5,
					entry: null,
					result: MapResult.Unchanged,
				},
			]);
		});

		it("should not increase index", () => {
			fc.assert(
				fc.property(
					arbDeleting(fc.integer()),
					fc.integer({ min: 0, max: 50 }),
					(xs, i) => mapIndex(xs, i).index <= i,
				),
			);
		});
	});

	describe("non-shifting splices (lenToRemove = replace.length)", () => {
		it("should return input as-is, specific examples", () => {
			expect(mapIndex([], 0).index).toBe(0);
			const entry = {
				index: 0,
				lenToRemove: 1,
				replace: ["a"],
			};
			const entry0m = {
				i: 0,
				di: 1,
				j: 0,
				dj: 1,
				replace: ["a"],
			};
			expect([0, 1, 2].map((i) => mapIndex([entry], i))).toEqual([
				{ index: 0, entry: entry0m, result: MapResult.Replaced },
				{ index: 1, entry: null, result: MapResult.Unchanged },
				{ index: 2, entry: null, result: MapResult.Unchanged },
			]);
		});

		it("should return index as-is", () => {
			fc.assert(
				fc.property(
					arbNonShifting(fc.integer(), fc.constant(null)),
					fc.integer({ min: 0, max: 50 }),
					(xs, i) => mapIndex(xs, i).index === i,
				),
			);
		});
	});

	describe("adding splices", () => {
		it("adding with zero removals", () => {
			const entry = {
				index: 1,
				lenToRemove: 0,
				replace: ["a"],
			};
			expect(mapIndex([entry], 0).index).toBe(0);
			expect(mapIndex([entry], 1).index).toBe(2);
			expect(mapIndex([entry], 2).index).toBe(3);
			expect([0, 1, 2].map((i) => mapIndex([entry], i))).toEqual([
				{ index: 0, entry: null, result: MapResult.Unchanged },
				{ index: 2, entry: null, result: MapResult.Unchanged },
				{ index: 3, entry: null, result: MapResult.Unchanged },
			]);
		});

		it("should not decrease index", () => {
			fc.assert(
				fc.property(
					arbAdding(fc.integer(), fc.constant(null)),
					fc.integer({ min: 0, max: 50 }),
					(xs, i) => mapIndex(xs, i).index >= i,
				),
			);
		});
	});
});

describe("unmapIndex", () => {
	describe("empty splice table", () => {
		it("should have unchanged index", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 10 }),
					(i) => unmapIndex([], i).index === i,
				),
			);
		});

		it("should have null entry ", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 10 }),
					(i) => unmapIndex([], i).entry === null,
				),
			);
		});

		it("should have Unchanged result", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 10 }),
					(i) => unmapIndex([], i).result === MapResult.Unchanged,
				),
			);
		});
	});

	describe("non-shifting splices (lenToRemove = replace.length)", () => {
		it("should return input as-is, specific examples", () => {
			expect(unmapIndex([], 0).index).toBe(0);
			const entry = {
				index: 0,
				lenToRemove: 1,
				replace: ["a"],
			};
			const entry0m = {
				i: 0,
				di: 1,
				j: 0,
				dj: 1,
				replace: ["a"],
			};
			expect([0, 1, 2].map((i) => unmapIndex([entry], i))).toEqual([
				{ index: 0, entry: entry0m, result: MapResult.Replaced },
				{ index: 1, entry: null, result: MapResult.Unchanged },
				{ index: 2, entry: null, result: MapResult.Unchanged },
			]);
		});

		it("should return index as-is", () => {
			fc.assert(
				fc.property(
					arbNonShifting(fc.integer(), fc.constant(null)),
					fc.integer({ min: 0, max: 50 }),
					(xs, i) => unmapIndex(xs, i).index === i,
				),
			);
		});
	});
});

describe("mapIndex and unmapIndex", () => {
	it("inverse function: map/unmap", () => {
		fc.assert(
			fc.property(
				arbNonShifting(fc.integer(), fc.constant(null)),
				fc.integer({ min: 0, max: 50 }),
				(xs, i) => mapIndex(xs, unmapIndex(xs, i).index).index === i,
			),
		);
	});

	it("inverse function: unmap/map", () => {
		fc.assert(
			fc.property(
				arbNonShifting(fc.integer(), fc.constant(null)),
				fc.integer({ min: 0, max: 50 }),
				(xs, i) => unmapIndex(xs, mapIndex(xs, i).index).index === i,
			),
		);
	});
});

describe("SpliceTable operations", () => {
	it("sample", () => {
		const res = fc.sample(
			p.arbSpliceTable<number, s.DRO<number>>({
				arbValue: fc.integer(),
				arbChange: (_) => p.integer().getArbApply().arbChange({ depth: 8 }),
			}),
			{ numRuns: 500 },
		);
		for (const e of res) {
			console.log(e.entries);
		}
	});
	describe("of boolean", () => {
		testSpliceTableInvariants(
			p.arbSpliceTable<boolean, s.DRO<boolean>>({
				arbValue: fc.boolean(),
				arbChange: (_) => p.boolean().getArbApply().arbChange({ depth: 8 }),
			}),
		);
	});

	describe("of number", () => {
		testSpliceTableInvariants(
			p.arbSpliceTable<number, s.DRO<number>>({
				arbValue: fc.integer(),
				arbChange: (_) => p.integer().getArbApply().arbChange({ depth: 8 }),
			}),
		);
	});
});

describe("apply", () => {
	const num = s.number();
	it("identity should leave array unchanged", () => {
		fc.assert(
			fc.property(fc.array(fc.integer()), (arr) => {
				expect(
					SpliceTable.identity<number, s.$D<typeof num>>().apply(arr, num),
				).toEqual(arr);
			}),
		);
	});

	it("splice on empty array", () => {
		expect(
			SpliceTable.fromSplice<number, s.$D<typeof num>>(0, 0, [0]).apply(
				[],
				num,
			),
		).toEqual(([] as number[]).toSpliced(0, 0, 0));
	});

	it("splice on singleton array", () => {
		const arr = [0];
		const actual = SpliceTable.fromSplice<number, s.$D<typeof num>>(
			1,
			0,
			[-1],
		).apply(arr, num);
		const expected = arr.toSpliced(1, 0, -1);
		expect(actual).toEqual(expected);
	});

	const arrInt = fc.array(fc.integer(), { minLength: 0, maxLength: 10 });
	it("splice should perform a single array splice", () => {
		fc.assert(
			fc.property(
				arrInt,
				fc.record({
					i: fc.integer({ min: 0, max: 5 }),
					toDelete: fc.integer({ min: 0, max: 5 }),
					replace: arrInt,
				}),
				(arr, { i, toDelete, replace }) => {
					fc.pre(arr.length >= i + toDelete);
					expect(
						SpliceTable.fromSplice<number, s.$D<typeof num>>(
							i,
							toDelete,
							replace,
						).apply(arr, num),
					).toEqual(arr.toSpliced(i, toDelete, ...replace));
				},
			),
		);
	});

	// it.skip("combine with replace", () => {
	// 	const gen = p.integer();
	// 	const genValue = p.genValueFromApply(gen);
	// 	const genChange = p.genChangeFromApply(gen);
	// 	fc.assert(
	// 		fc.property(
	// 			arbSpliceTable(genValue, genChange).chain(
	// 				(table): SpliceTable<s.$T<typeof gen>, s.$D<typeof gen>> => {
	// 					return fc
	// 						.integer({ min: 0, max: table.requiredLength })
	// 						.chain((i) => fc.tuple(fc.constant(i), genChange))
	// 						.map(([i, change]) => [
	// 							{
	// 								i,
	// 								di: 1,
	// 								j: i,
	// 								dj: 1,
	// 								change,
	// 							},
	// 						]);
	// 				},
	// 			),
	// 			(table) => {},
	// 		),
	// 	);
	// });
});

function testSpliceTableInvariants<T, DT>(arb: p.Arb<SpliceTable<T, DT>>) {
	describe("splice table invariants", () => {
		test("i ascending", () => {
			fc.assert(
				fc.property(arb, (table) => {
					return asc(table.entries.map((x) => x.i));
				}),
			);
		});

		test("j ascending", () => {
			fc.assert(
				fc.property(arb, (table) => {
					return asc(table.entries.map((x) => x.j));
				}),
			);
		});

		test("ascending list of non-overlapping intervals for i", () => {
			fc.assert(
				fc.property(arb, (table) => {
					return noOverlapAsc(table.entries.map(({ i, di }) => [i, i + di]));
				}),
			);
		});

		test("change and replace are consistent with dj", () => {
			fc.assert(
				fc.property(arb, (table) => {
					for (const entry of table.entries) {
						if ("change" in entry) {
							if (entry.dj !== 1) {
								return false;
							}
							continue;
						}
						if (entry.dj !== entry.replace.length) {
							return false;
						}
					}
					return true;
				}),
			);
		});
	});
}

/** Each interval represents `[a, b)`. Tests the list is ascending and non-overlapping. */
function noOverlapAsc(intervals: [number, number][]) {
	if (intervals.length <= 1) {
		return true;
	}
	for (let i = 0; i < intervals.length - 1; i++) {
		const [a1, b1] = intervals[i]!;
		const [a2, b2] = intervals[i + 1]!;
		if (!(a1 <= a2 && a1 <= b1 && a2 <= b2 && b1 <= a2)) {
			return false;
		}
	}
	return true;
}

function asc<T>(xs: T[]) {
	if (xs.length <= 1) {
		return true;
	}
	for (let i = 0; i < xs.length - 1; i++) {
		if (xs[i]! > xs[i + 1]!) {
			return false;
		}
	}
	return true;
}
