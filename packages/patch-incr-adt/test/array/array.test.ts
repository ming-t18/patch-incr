// biome-ignore-all lint/style/noNonNullAssertion: for checked array access
import { describe, expect, it, test } from "bun:test";
import fc from "fast-check";
import {
	applyInside,
	combineTables,
	cutSpliceEntry,
	MapResult,
	mapIndex,
	mergeAdjacents,
	type ParSpliceEntries,
	type ParSpliceEntry,
	type SpliceEntry,
	SpliceTable,
	unmapIndex,
} from "@/array/splice";
import * as s from "@/index";
import * as p from "@/props";
import { testCasesPropsApply } from "../fastCheck/testPropsApply.test";

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
				{ index: 0, entry: null, result: MapResult.Unchanged, entryIndex: 0 },
				{ index: 1, entry: entry0m, result: MapResult.Removed, entryIndex: 0 },
				{ index: 1, entry: entry0m, result: MapResult.Removed, entryIndex: 0 },
				{ index: 1, entry: null, result: MapResult.Unchanged, entryIndex: 1 },
				{ index: 2, entry: null, result: MapResult.Unchanged, entryIndex: 1 },
			]);
		});

		test("should return lower indexes, specific examples", () => {
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
				{ index: 0, entry: null, result: MapResult.Unchanged, entryIndex: 0 },
				{ index: 1, entry: entry0m, result: MapResult.Removed, entryIndex: 0 },
				{ index: 1, entry: entry0m, result: MapResult.Removed, entryIndex: 0 },
				{
					index: 1,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: 1,
				},
				{
					index: 2,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: 1,
				},
				{
					index: 3,
					entry: entry1m,
					result: MapResult.Removed,
					entryIndex: 1,
				},
				{
					index: 3,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: 2,
				},
				{
					index: 4,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: 2,
				},
				{
					index: 5,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: 2,
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
				{ index: 0, entry: entry0m, result: MapResult.Replaced, entryIndex: 0 },
				{ index: 1, entry: null, result: MapResult.Unchanged, entryIndex: 1 },
				{ index: 2, entry: null, result: MapResult.Unchanged, entryIndex: 1 },
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
				{ index: 0, entry: null, result: MapResult.Unchanged, entryIndex: 0 },
				{ index: 2, entry: null, result: MapResult.Unchanged, entryIndex: 1 },
				{ index: 3, entry: null, result: MapResult.Unchanged, entryIndex: 1 },
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
				{ index: 0, entry: entry0m, result: MapResult.Replaced, entryIndex: 0 },
				{ index: 1, entry: null, result: MapResult.Unchanged, entryIndex: 0 },
				{ index: 2, entry: null, result: MapResult.Unchanged, entryIndex: 0 },
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

describe("SpliceTable invariants", () => {
	it.skip("sample", () => {
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
		testSpliceTableInvariants<boolean, s.DRO<boolean>>(
			fc.record({
				table: p.arbSpliceTable<boolean, s.DRO<boolean>>({
					arbValue: fc.boolean(),
					arbChange: (_) => p.boolean().getArbApply().arbChange({ depth: 8 }),
				}),
			}),
		);
	});

	describe("of number", () => {
		testSpliceTableInvariants<number, s.DRO<number>>(
			fc.record({
				table: p.arbSpliceTable<number, s.DRO<number>>({
					arbValue: fc.integer(),
					arbChange: (_) => p.integer().getArbApply().arbChange({ depth: 8 }),
				}),
			}),
		);
	});
});

describe("SpliceTable apply", () => {
	const num = s.number();

	test("empty on empty", () => {
		const table = new SpliceTable<number, s.DRO<number>>([
			{ i: 0, di: 0, j: 0, dj: 0, replace: [] },
		]);
		expect(table.requiredLength).toBe(0);
		expect(table.apply([], p.integer())).toEqual([]);
	});

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
});

describe("helpers", () => {
	describe("applyInside", () => {
		test("performs a splice", () => {
			const lhs = {
				i: 5,
				di: 0,
				j: 10,
				dj: 5,
				replace: [10, 20, 30, 40, 50],
			};
			const rhs = {
				i: 2,
				di: 3,
				j: 4,
				dj: 2,
				replace: [100, 200],
			};
			expect(applyInside(lhs, rhs, p.integer(), 2)).toEqual([
				{
					i: 5,
					di: 0,
					j: 10,
					dj: 4,
					replace: [10, 20, 100, 200],
				},
				// rhs takes 1 element away, di=3 -> dj=2
				-1,
			]);
		});

		test("performs a delete-all splice", () => {
			const lhs = {
				i: 5,
				di: 0,
				j: 10,
				dj: 5,
				replace: [10, 20, 30, 40, 50],
			};
			const rhs = {
				i: 4,
				di: 5,
				j: 5,
				dj: 0,
				replace: [],
			};
			expect(applyInside(lhs, rhs, p.integer(), 0)).toEqual([
				{
					i: 5,
					di: 0,
					j: 10,
					dj: 0,
					replace: [],
				},
				-5,
			]);
		});

		describe("with change", () => {
			test("change-change", () => {
				const lhs = {
					i: 5,
					di: 1 as const,
					j: 10,
					dj: 1 as const,
					change: s.makeReplaceOnly(4),
				};
				const rhs = {
					i: 4,
					di: 1 as const,
					j: 5,
					dj: 1 as const,
					change: s.makeReplaceOnly(5),
				};
				expect(applyInside(lhs, rhs, p.integer(), 0)).toEqual([
					{
						i: 5,
						di: 1,
						j: 10,
						dj: 1,
						change: s.makeReplaceOnly(5),
					},
					0,
				]);
			});
			test("replace-change", () => {
				const lhs = {
					i: 5,
					di: 20,
					j: 10,
					dj: 1,
					replace: [-1],
				};
				const rhs = {
					i: 4,
					di: 1 as const,
					j: 5,
					dj: 1 as const,
					change: s.makeReplaceOnly(5),
				};
				expect(applyInside(lhs, rhs, p.integer(), 0)).toEqual([
					{
						i: 5,
						di: 20,
						j: 10,
						dj: 1,
						replace: [5],
					},
					0,
				]);
			});
			test("change-replace", () => {
				const lhs = {
					i: 5,
					di: 1 as const,
					j: 10,
					dj: 1 as const,
					change: s.makeReplaceOnly(-1),
				};
				const rhs = {
					i: 4,
					di: 1,
					j: 5,
					dj: 1,
					replace: [5],
				};
				expect(applyInside(lhs, rhs, p.integer(), 0)).toEqual([
					{
						i: 5,
						di: 1,
						j: 10,
						dj: 1,
						replace: [5],
					},
					0,
				]);
			});
		});
	});

	describe("mergeAdjacents", () => {
		test("should not increase length", () => {
			fc.assert(
				fc.property(
					p.arbSpliceTable<number, s.DRO<number>>({
						arbValue: fc.integer(),
						arbChange: () => p.arbDRO(fc.integer()),
					}),
					({ entries }) => {
						mergeAdjacents(entries).length <= entries.length;
					},
				),
			);
		});
		test("preserve apply results", () => {
			const a = p.integer();
			fc.assert(
				fc.property(
					fc.array(fc.integer()),
					p.arbSpliceTable<number, s.DRO<number>>({
						arbValue: fc.integer(),
						arbChange: () => p.arbDRO(fc.integer()),
					}),
					(arr, table) => {
						fc.pre(arr.length >= table.requiredLength);
						const table1 = new SpliceTable(mergeAdjacents(table.entries));
						expect(table1.apply(arr, a)).toEqual(table.apply(arr, a));
					},
				),
			);
		});
		test("remove empty entries", () => {
			expect(
				mergeAdjacents([{ i: 1, di: 0, j: 1, dj: 0, replace: [] }]),
			).toEqual([]);
			expect(
				mergeAdjacents([
					{ i: 1, di: 0, j: 1, dj: 0, replace: [] },
					{ i: 1, di: 0, j: 1, dj: 0, replace: [] },
				]),
			).toEqual([]);
		});

		test("merge 2 adjacent entries", () => {
			expect(
				mergeAdjacents([
					{ i: 1, di: 1, j: 1, dj: 1, replace: [false] },
					{ i: 2, di: 0, j: 2, dj: 2, replace: [true, true] },
				]),
			).toEqual([{ i: 1, di: 1, j: 1, dj: 3, replace: [false, true, true] }]);

			expect(
				mergeAdjacents([
					{ i: 1, di: 1, j: 1, dj: 1, replace: [false] },
					{ i: 2, di: 0, j: 2, dj: 2, replace: [true, true] },
					{ i: 2, di: 3, j: 4, dj: 1, replace: [false] },
				]),
			).toEqual([
				{ i: 1, di: 4, j: 1, dj: 4, replace: [false, true, true, false] },
			]);
		});
	});
});

describe("SpliceTable combine", () => {
	describe("from factories", () => {
		test("unshift", () => {
			// const arr = [1, 2, 3];
			// arr.unshift(10, 20);
			// arr.unshift(30, 40, 50);
			// console.log(arr); // => [30, 40, 50, 10, 20, 1, 2, 3]
			const left = SpliceTable.fromUnshift<number, s.DRO<number>>([10, 20]);
			const right = SpliceTable.fromUnshift<number, s.DRO<number>>([
				30, 40, 50,
			]);
			const combined = left.combine(right, p.integer());
			expect(combined.apply([1, 2, 3], p.integer())).toEqual([
				30, 40, 50, 10, 20, 1, 2, 3,
			]);
			// ensures simplification is performed (merges two element)
			expect(combined.entries).toEqual(
				SpliceTable.fromUnshift<number, s.DRO<number>>([30, 40, 50, 10, 20])
					.entries,
			);
		});

		test("push", () => {
			const left = SpliceTable.fromPush<number, s.DRO<number>>(3, [10, 20]);
			const right = SpliceTable.fromPush<number, s.DRO<number>>(
				5,
				[30, 40, 50],
			);
			const combined = left.combine(right, p.integer());
			expect(combined.apply([1, 2, 3], p.integer())).toEqual([
				1, 2, 3, 10, 20, 30, 40, 50,
			]);
			expect(combined.entries).toEqual(
				SpliceTable.fromPush<number, s.DRO<number>>(3, [10, 20, 30, 40, 50])
					.entries,
			);
		});

		test("overwrite-all", () => {
			const left = SpliceTable.fromSplice<number, s.DRO<number>>(
				5,
				1,
				[10, 20, 30],
			);
			const right = SpliceTable.fromSplice<number, s.DRO<number>>(0, 8, []);
			const combined = left.combine(right, p.integer());
			// 8 maps to 7
			expect(combined.entries).toEqual([
				{
					i: 0,
					j: 0,
					di: 6,
					dj: 0,
					replace: [],
				},
			]);
			testApplyCombine(
				[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				left,
				right,
				p.integer(),
			);
		});

		test("append-before", () => {
			const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			const left = SpliceTable.fromSplice<number, s.DRO<number>>(5, 4, [10]);
			const right = SpliceTable.fromSplice<number, s.DRO<number>>(
				1,
				0,
				[20, 30],
			);
			testApplyCombine(input, left, right, p.integer());
		});

		test("append-after with displacement taken into account", () => {
			const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			// left      0 [1 2 3 4] 5 6 7   8 9
			//           0  1        2 3 4   5 6
			// right     0  1        2 3 4 [     ] 5
			//           0  1        2 3 4   5 6   7
			//
			// combined  0 [1 2 3 4] [      ] 5
			//           0  1        2 3 4 [ 5 6 ] 7
			const left = SpliceTable.fromSplice<number, s.DRO<number>>(1, 4, [10]);
			const right = SpliceTable.fromSplice<number, s.DRO<number>>(
				5,
				0,
				[20, 30],
			);
			expect(left.combine(right, p.integer()).entries).toEqual([
				{
					i: 1,
					di: 4,
					j: 1,
					dj: 1,
					replace: [10],
				},
				{
					i: 8,
					di: 0,
					j: 5,
					dj: 2,
					replace: [20, 30],
				},
			]);
			testApplyCombine(input, left, right, p.integer());
		});

		it("acting on a splice replacement, internal change", () => {
			// left    0 [1    ] 2 3 4
			//         0  1 2 3  4 5 6
			// right   0  1[2]...
			const input = [false, false, false, false, false];
			const left = new SpliceTable<boolean, s.DRO<boolean>>([
				{ i: 1, di: 1, j: 1, dj: 2, replace: [true, false, true] },
			]);
			const right = new SpliceTable<boolean, s.DRO<boolean>>([
				{ i: 2, di: 1, j: 2, dj: 1, change: s.makeReplaceOnly(true) },
			]);
			testApplyCombine(input, left, right, p.boolean());
		});
	});

	describe("non-overlapping operations", () => {
		test("unshift + unshift at the same index", () => {
			return fc.assert(
				fc.property(
					fc
						.record({
							arr: fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
							leftArr: fc.array(fc.integer(), { minLength: 0, maxLength: 10 }),
							rightArr: fc.array(fc.integer(), { minLength: 0, maxLength: 10 }),
						})
						.chain(({ arr, leftArr, rightArr }) =>
							fc.record({
								arr: fc.constant(arr),
								leftArr: fc.constant(leftArr),
								rightArr: fc.constant(rightArr),
								index: fc.integer({ min: 0, max: arr.length - 1 }),
							}),
						)
						.map(({ arr, leftArr, rightArr, index }) => {
							const a1 = [...arr];
							a1.splice(index, 0, ...leftArr);
							a1.splice(index, 0, ...rightArr);
							const left = SpliceTable.fromSplice<number, s.DRO<number>>(
								index,
								0,
								leftArr,
							);
							const right = SpliceTable.fromSplice<number, s.DRO<number>>(
								index,
								0,
								rightArr,
							);
							const combined = left.combine(right, p.integer());
							return {
								apply: p.integer(),
								arr,
								left,
								right,
								combined,
								actual: combined.apply(arr, p.integer()),
								expected: a1,
							};
						}),
					propApplyCombine,
				),
				{ numRuns: 10000 },
			);
		});

		test("chained push + push", () => {
			fc.assert(
				fc.property(
					fc
						.record({
							arr: fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
							leftArr: fc.array(fc.integer(), { minLength: 0, maxLength: 10 }),
							rightArr: fc.array(fc.integer(), { minLength: 0, maxLength: 10 }),
						})
						.map(({ arr, leftArr, rightArr }) => {
							const a1 = [...arr];
							a1.push(...leftArr);
							a1.push(...rightArr);
							const left = SpliceTable.fromPush<number, s.DRO<number>>(
								arr.length,
								leftArr,
							);
							const right = SpliceTable.fromPush<number, s.DRO<number>>(
								arr.length + leftArr.length,
								rightArr,
							);
							return {
								apply: p.integer(),
								arr,
								left,
								right,
								combined: left.combine(right, p.integer()),
								expected: a1,
							};
						}),
					propApplyCombine,
				),
			);
		});
	});
});

describe("combineTables", () => {
	const arbTableInt = p.arbSpliceTable<number, s.DRO<number>>({
		arbValue: fc.integer(),
		arbChange: () => p.integer().getArbApply().arbChange({ depth: 8 }),
	});

	describe("properties", () => {
		test("combine with identity, from left", () => {
			fc.assert(
				fc.property(arbTableInt, (table) => {
					const res = combineTables(
						table,
						SpliceTable.identity(),
						p.integer(),
						false,
					).entries;
					try {
						expect(res).toEqual(table.entries);
					} catch (e) {
						console.error("fail", { expected: table.entries, actual: res });
						throw e;
					}
				}),
			);
		});

		test("combine with identity, from right", () => {
			fc.assert(
				fc.property(arbTableInt, (table) => {
					const res = combineTables(
						SpliceTable.identity<number, s.DRO<number>>(),
						table,
						p.integer(),
						false,
					).entries;
					try {
						expect(res).toEqual(table.entries);
					} catch (e) {
						console.error("fail", { expected: table.entries, actual: res });
						throw e;
					}
				}),
			);
		});

		test("combine with distant no-op change, from left", () => {
			fc.assert(
				fc.property(
					arbTableInt.map((t) => {
						const iLast = t.requiredLength + 10;
						const jLast = t.mapIndex(iLast).index;
						return {
							arr: Array(iLast + 1)
								.fill(null)
								.map((_, i) => -i - 100),
							left: t,
							right: new SpliceTable<number, s.DRO<number>>([
								{
									i: jLast,
									di: 1 as const,
									j: jLast,
									dj: 1 as const,
									change: null,
								},
							]),
						};
					}),
					({ arr, left, right }) => {
						const combined = combineTables(left, right, p.integer(), false);
						expect(
							combined.entries.slice(0, left.entries.length) as never[],
						).toEqual(left.entries as never[]);
						propApplyCombine({
							apply: p.integer(),
							arr,
							left,
							right,
							combined,
						});
					},
				),
			);
		});

		test("combine with distant no-op change, from right", () => {
			fc.assert(
				fc.property(
					arbTableInt.map((t) => {
						const iLast = t.requiredLength + 10;
						return {
							arr: Array(iLast + 1)
								.fill(null)
								.map((_, i) => -i - 100),
							left: new SpliceTable<number, s.DRO<number>>([
								{
									i: iLast,
									di: 1 as const,
									j: iLast,
									dj: 1 as const,
									change: null,
								},
							]),
							right: t,
						};
					}),
					({ arr, left, right }) => {
						let combined1: typeof left | null = null;
						try {
							const combined = combineTables(left, right, p.integer(), false);
							combined1 = combined;
							expect(combined.entries.slice(0, right.entries.length)).toEqual(
								right.entries as never[],
							);
							propApplyCombine({
								apply: p.integer(),
								arr,
								left,
								right,
								combined,
							});
						} catch (e) {
							console.error({
								arr,
								left: left.entries,
								right: right.entries,
								combined: combined1?.entries,
							});
							console.error(e);
							throw e;
						}
					},
				),
			);
		});

		test("combine create array from empty with changes within requiredLength", () => {
			fc.assert(
				fc.property(
					fc.array(fc.integer(), { maxLength: 16 }),
					arbTableInt,
					(arr, table) => {
						const lhs = new SpliceTable<number, s.DRO<number>>([
							{ i: 0, di: 0, j: 0, dj: arr.length, replace: arr },
						]);
						fc.pre(table.requiredLength <= arr.length);
						const combined = combineTables(lhs, table, p.integer(), false);
						// console.log({
						// 	lhs: lhs.entries,
						// 	before: table.entries,
						// 	after: combined.entries,
						// });
						expect(combined.requiredLength).toBe(0);
						const actual = combined.apply([], p.integer());
						const expected = table.apply(arr, p.integer());
						// console.log({ expected, actual });
						expect(actual).toEqual(expected);
					},
				),
			);
		});
	});

	describe("examples", () => {
		test("non-overlapping case 1", () => {
			const left = new SpliceTable<number, s.DRO<number>>([
				{
					i: 1,
					di: 1,
					j: 1,
					dj: 3,
					replace: [10, 20, 30],
				},
			]);
			const right = new SpliceTable<number, s.DRO<number>>([
				{
					i: 5,
					di: 1,
					j: 5,
					dj: 5,
					replace: [40, 50, 60, 70, 80],
				},
			]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			propApplyCombine({
				apply: p.integer(),
				arr: [1, 2, 3, 4],
				combined,
				left,
				right,
				expected: [1, 10, 20, 30, 3, 40, 50, 60, 70, 80],
			});
		});

		test("non-overlapping case 3, adjacent", () => {
			const left = new SpliceTable<number, s.DRO<number>>([
				{
					i: 1,
					di: 2,
					j: 1,
					dj: 0,
					replace: [],
				},
			]);
			const right = new SpliceTable<number, s.DRO<number>>([
				{
					i: 1,
					di: 2,
					j: 1,
					dj: 4,
					replace: [40, 50, 60, 70],
				},
			]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			expect(combined.entries).toEqual([
				{ i: 1, di: 4, j: 1, dj: 4, replace: [40, 50, 60, 70] },
			]);
			propApplyCombine({
				apply: p.integer(),
				arr: [1, 2, 3, 4, 5],
				combined,
				left,
				right,
			});
		});

		test("overlap-before", () => {
			const left = new SpliceTable<number, s.DRO<number>>([
				{
					i: 1,
					di: 0,
					j: 1,
					dj: 5,
					replace: [100, 200, 300, 400, 500],
				},
			]);
			const right = new SpliceTable<number, s.DRO<number>>([
				{
					i: 3,
					di: 6,
					j: 3,
					dj: 0,
					replace: [],
				},
			]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			propApplyCombine({
				apply: p.integer(),
				arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				combined,
				left,
				right,
			});
		});

		test("combine with identity from left test", () => {
			const left = new SpliceTable<number, s.DRO<number>>([
				{
					i: 0,
					di: 0,
					j: 0,
					dj: 1,
					replace: [0],
				},
				{
					i: 1,
					di: 1 as const,
					j: 2,
					dj: 1 as const,
					change: null,
				},
			]);
			const right = new SpliceTable<number, s.DRO<number>>([]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			expect(combined.entries).toEqual(left.entries);
			propApplyCombine({
				apply: p.integer(),
				arr: [100, 101],
				combined,
				left,
				right,
			});
		});

		test("combine with identity from right test", () => {
			const left = new SpliceTable<number, s.DRO<number>>([]);
			const right = new SpliceTable<number, s.DRO<number>>([
				{
					i: 0,
					di: 0,
					j: 0,
					dj: 1,
					replace: [0],
				},
				{
					i: 1,
					di: 0,
					j: 2,
					dj: 1,
					replace: [0],
				},
			]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			expect(combined.entries).toEqual(right.entries);
			propApplyCombine({
				apply: p.integer(),
				arr: [100, 101],
				combined,
				left,
				right,
			});
		});

		test("combine with distant no-op test", () => {
			const left = new SpliceTable<number, s.DRO<number>>([
				{
					i: 10,
					di: 1,
					j: 10,
					dj: 1,
					change: null,
				},
			]);
			const right = new SpliceTable<number, s.DRO<number>>([
				{
					i: 0,
					di: 0,
					j: 0,
					dj: 1,
					replace: [0],
				},
				{
					i: 1,
					di: 1 as const,
					j: 2,
					dj: 1 as const,
					change: s.makeReplaceOnly(-1),
				},
			]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			expect(combined.entries.slice(0, right.entries.length)).toEqual(
				right.entries as never[],
			);
			propApplyCombine({
				apply: p.integer(),
				arr: [100, 101, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
				combined,
				left,
				right,
			});
		});

		test("combine with distant no-op test 1", () => {
			const left = new SpliceTable<number, s.DRO<number>>([
				{ i: 15, di: 1, j: 15, dj: 1, change: null },
			]);
			const right = new SpliceTable<number, s.DRO<number>>([
				{ i: 1, di: 1, j: 1, dj: 1, change: s.makeReplaceOnly(0) },
				{ i: 3, di: 0, j: 3, dj: 1, replace: [0] },
				{ i: 4, di: 0, j: 5, dj: 10, replace: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
				{ i: 5, di: 0, j: 16, dj: 1, replace: [0] },
			]);
			const combined = combineTables<number, s.DRO<number>>(
				left,
				right,
				p.integer(),
			);
			expect(combined.entries.slice(0, right.entries.length)).toEqual(
				right.entries as never[],
			);
			propApplyCombine({
				apply: p.integer(),
				arr: [
					100, 101, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
					115, 116,
				],
				combined,
				left,
				right,
			});
		});

		test("combine effective replace with changes", () => {
			const arr: number[] = [0, 0];
			const table = new SpliceTable<number, s.DRO<number>>([
				{ i: 1, di: 0, j: 1, dj: 1, replace: [0] },
			]);

			const lhs = new SpliceTable<number, s.DRO<number>>([
				{ i: 0, di: 0, j: 0, dj: arr.length, replace: arr },
			]);
			const combined = combineTables(lhs, table, p.integer(), false);
			const actual = combined.apply([], p.integer());
			const expected = table.apply(arr, p.integer());
			expect(actual).toEqual(expected);
		});

		test("combine effective replace with changes, 3 non-offseting replaces only", () => {
			const arr: number[] = [0, 0, 0];
			const table = new SpliceTable<number, s.DRO<number>>([
				{ i: 0, di: 1, j: 0, dj: 1, replace: [1] },
				{ i: 1, di: 1, j: 1, dj: 1, replace: [2] },
				{ i: 2, di: 1, j: 2, dj: 1, replace: [3] },
			]);

			const lhs = SpliceTable.fromSplice<number, s.DRO<number>>(0, 0, arr);
			const combined = combineTables(lhs, table, p.integer(), false);
			const actual = combined.apply([], p.integer());
			const expected = table.apply(arr, p.integer());
			expect(actual).toEqual(expected);
		});

		test("combine effective replace with changes, 2 entries", () => {
			const arr: number[] = [0, 0, 0];
			const table = new SpliceTable<number, s.DRO<number>>([
				{ i: 1, di: 1, j: 1, dj: 0, replace: [] },
				{ i: 3, di: 0, j: 2, dj: 1, replace: [1] },
			]);

			const lhs = SpliceTable.fromSplice<number, s.DRO<number>>(0, 0, arr);
			const combined = combineTables(lhs, table, p.integer(), false);
			const actual = combined.apply([], p.integer());
			const expected = table.apply(arr, p.integer());
			expect(actual).toEqual(expected);
		});

		test("combine effective replace with changes, containing delete", () => {
			const arr: number[] = [0];
			const table = new SpliceTable<number, s.DRO<number>>([
				{ i: 0, di: 1, j: 0, dj: 1, change: s.makeReplaceOnly(0) },
				{ i: 1, di: 0, j: 1, dj: 1, replace: [1] },
			]);

			const lhs = SpliceTable.fromSplice<number, s.DRO<number>>(0, 0, arr);
			const combined = combineTables(lhs, table, p.integer(), false);
			const actual = combined.apply([], p.integer());
			const expected = table.apply(arr, p.integer());
			expect(actual).toEqual(expected);
		});

		test("no negative i or j test 1", () => {
			const lhs = new SpliceTable<null, null>([
				{
					i: 0,
					di: 1,
					j: 0,
					dj: 5,
					replace: [null, null, null, null, null],
				},
				{ i: 1, di: 1, j: 5, dj: 1, replace: [null] },
			]);
			const rhs = new SpliceTable<null, null>([
				{ i: 0, di: 100, j: 0, dj: 0, replace: [] },
			]);
			const combined = lhs.combine(rhs, p.constant(null));
			expect(combined.entries.every((e) => e.i >= 0 && e.j >= 0)).toBe(true);
		});

		test("no negative i or j test 2", () => {
			const lhs = new SpliceTable<null, null>([
				{
					i: 1,
					di: 0,
					j: 1,
					dj: 2,
					replace: [null, null],
				},
			]);
			const rhs = new SpliceTable<null, null>([
				{ i: 0, di: 0, j: 0, dj: 2, replace: [null, null] },
				{ i: 1, di: 1, j: 3, dj: 1, change: null },
			]);
			const combined = lhs.combine(rhs, p.constant(null));
			expect(combined.entries.every((e) => e.i >= 0 && e.j >= 0)).toBe(true);
		});

		test("assoc fail, actually merge fail", () => {
			const a = new SpliceTable<null, null>([
				{ i: 2, di: 1, j: 2, dj: 1, change: null },
			]);
			const b = new SpliceTable<null, null>([
				{
					i: 0,
					di: 1,
					j: 0,
					dj: 1,
					change: null,
				},
			]);
			const c = new SpliceTable<null, null>([
				{ i: 0, di: 3, j: 0, dj: 0, replace: [] },
			]);
			const apply = p.constant(null);
			const ab = a.combine(b, apply);
			const bc = b.combine(c, apply);
			expect(ab.combine(c, apply).entries).toEqual(
				a.combine(bc, apply).entries,
			);
		});
	});
});

describe("combine examples", () => {
	test("overlap and merging", () => {
		const apply = p.string();
		const input = ["a", "b", "c"];
		const left = new SpliceTable<string, s.DRO<string>>([
			{ i: 3, di: 0, j: 3, dj: 3, replace: ["d", "e", "f"] },
		]);
		const right = new SpliceTable<string, s.DRO<string>>([
			{ i: 1, di: 4, j: 1, dj: 0, replace: [] },
			{ i: 6, di: 0, j: 2, dj: 1, replace: ["g"] },
		]);
		const combined = left.combine(right, apply);
		propApplyCombine({ apply, arr: input, left, right, combined });
	});

	test("replace only handling", () => {
		const a = p.integer();
		const input = [100, 100, 100];
		const left = new SpliceTable<number, s.DRO<number>>([
			{ i: 3, di: 0, j: 3, dj: 1, replace: [100] },
		]);
		const right = new SpliceTable<number, s.DRO<number>>([
			{
				i: 3,
				di: 1,
				j: 3,
				dj: 1,
				change: s.makeReplaceOnly(101),
				// replace: [101],
			},
		]);
		const combined = left.combine(right, a);
		expect(combined.entries).toEqual([
			{
				i: 3,
				di: 0,
				j: 3,
				dj: 1,
				replace: [101],
			},
		]);
		expect(combined.apply(input, a)).toEqual([100, 100, 100, 101]);
	});

	test("mixed with replace 1", () => {
		const a = p.integer();
		const input = [100];
		const left = new SpliceTable<number, s.DRO<number>>([
			{ i: 0, di: 0, j: 0, dj: 2, replace: [101, 102] },
		]);
		const right = new SpliceTable<number, s.DRO<number>>([
			{
				i: 2,
				di: 1,
				j: 2,
				dj: 1,
				change: s.makeReplaceOnly(103),
			},
			{
				i: 3,
				di: 0,
				j: 3,
				dj: 1,
				replace: [104],
			},
		]);
		const combined = left.combine(right, a);
		expect(combined.entries).toEqual([
			{
				i: 0,
				di: 0,
				j: 0,
				dj: 2,
				replace: [101, 102],
			},
			{
				i: 0,
				di: 1,
				j: 2,
				dj: 1,
				change: s.makeReplaceOnly(103),
			},
			{
				i: 1,
				di: 0,
				j: 3,
				dj: 1,
				replace: [104],
			},
		]);
		expect(right.apply(left.apply(input, a), a)).toEqual(
			combined.apply(input, a),
		);
	});

	test("mixed with replace 2", () => {
		const arr = [1, 2, 3, 4, 5];
		const left = new SpliceTable<number, s.DRO<number>>([
			{ i: 3, di: 0, j: 3, dj: 1, replace: [100] },
		]);
		const right = new SpliceTable<number, s.DRO<number>>([
			{ i: 0, di: 0, j: 0, dj: 1, replace: [101] },
			{
				i: 2,
				di: 1,
				j: 3,
				dj: 1,
				change: s.makeReplaceOnly(102),
			},
		]);
		const combined = left.combine(right, p.integer());
		expect(combined.entries).toEqual([
			{ i: 0, di: 0, j: 0, dj: 1, replace: [101] },
			{ i: 2, di: 1, j: 3, dj: 1, change: s.makeReplaceOnly(102) },
			{ i: 3, di: 0, j: 4, dj: 1, replace: [100] },
		]);
		propApplyCombine({ apply: p.integer(), left, right, combined, arr });
	});

	test("failing combine test case with overlap, simplified", () => {
		const apply = s.constant(null, null);
		const arr: null[] = Array(2).fill(null);
		const left = new SpliceTable<null, null>([
			{ i: 0, di: 2, j: 0, dj: 4, replace: [null, null, null, null] },
		]);
		const right = new SpliceTable<null, null>([
			{ i: 0, di: 1, j: 0, dj: 1, replace: [] },
			{ i: 3, di: 1, j: 2, dj: 1, replace: [] },
		]);
		const combined = left.combine(right, apply);
		propApplyCombine({ apply, left, right, combined, arr });
	});

	test("failing combine test case with overlap", () => {
		const apply = s.constant(null, null);
		const arr: null[] = Array(6).fill(null);
		const left = new SpliceTable<null, null>([
			{ i: 4, di: 2, j: 4, dj: 3, replace: [null, null, null] },
		]);
		const right = new SpliceTable<null, null>([
			{ i: 4, di: 1, j: 4, dj: 0, replace: [] },
			{ i: 6, di: 1, j: 5, dj: 1, change: null },
		]);
		const combined = left.combine(right, apply);
		propApplyCombine({ apply, left, right, combined, arr });
	});
});

// TODO still needs fixing
describe.skip("array cut", () => {
	describe("helpers", () => {
		describe("cutSpliceEntry", () => {
			test("cut zero dj", () => {
				const e = {
					i: 0,
					di: 2,
					j: 0,
					dj: 0,
					replace: [],
				};
				expect(cutSpliceEntry(e, 1)).toEqual([
					{ i: 1, di: 1, j: 1, dj: 0, replace: [] },
					{ i: 1, di: 1, j: 1, dj: 0, replace: [] },
				]);
			});

			test("cut insertion entry", () => {
				const e = {
					i: 0,
					di: 0,
					j: 0,
					dj: 2,
					replace: [1, 2],
				};
				expect(cutSpliceEntry(e, 0)).toEqual([null, e]);
			});
		});
	});
	test("cut and stitch at zero", () => {
		fc.assert(
			fc.property(
				p
					.genValueWithChange(s.array(p.integer()))
					.map((e) => e.dx)
					.filter((dx) => dx instanceof SpliceTable)
					.filter((dx) => dx.requiredLength > 0),
				(dx) => {
					try {
						const [l, r] = dx.cut(0);
						expect(l.entries.length).toBe(0);
						expect(r.entries).toEqual(r.entries);
						const stitched = l.stitch(r, 0);
						expect(dx.entries).toEqual(stitched.entries);
					} catch (e) {
						console.error(e);
						throw e;
					}
				},
			),
		);
	});

	test("cut and stitch in general", () => {
		fc.assert(
			fc.property(
				p
					.genValueWithChange(s.array(p.integer()))
					.map((e) => e.dx)
					.filter((dx) => dx instanceof SpliceTable)
					.filter((dx) => dx.requiredLength > 0)
					.chain((dx) =>
						fc.record({
							dx: fc.constant(dx as SpliceTable<number, s.DRO<number>>),
							i: fc.integer({ min: 0, max: dx.requiredLength - 1 }),
						}),
					),
				({ dx, i }) => {
					try {
						const [l, r] = dx.cut(i);
						const stitched = l.stitch(r, i);
						expect(dx.entries).toEqual(stitched.entries);
					} catch (e) {
						console.error(e);
						throw e;
					}
				},
			),
		);
	});

	test("cut identity", () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 100 }), (i) => {
				const id = SpliceTable.identity();
				const [l, r] = id.cut(i);
				return l.entries.length === 0 && r.entries.length === 0;
			}),
		);
	});

	test("cut and stitch between two entries", () => {
		const table = new SpliceTable<number, s.DRO<number>>([
			{ i: 0, di: 2, j: 0, dj: 4, replace: [10, 20, 30, 40] },
			{ i: 10, di: 4, j: 10, dj: 2, replace: [50, 60] },
		]);
		const [l, r] = table.cut(8);
		expect(l.entries).toEqual([table.entries[0]!]);
		expect(r.entries).toEqual([
			{ i: 2, di: 4, j: 2, dj: 2, replace: [50, 60] },
		]);
		const table1 = l.stitch(r, 8);
		expect(table1.entries).toEqual(table.entries);
	});

	test("cut and stitch at zero example", () => {
		const table = new SpliceTable<number, s.DRO<number>>([
			{ i: 1, di: 1, j: 1, dj: 1, replace: [10] },
		]);
		const [l, r] = table.cut(0);
		expect(l.entries).toEqual([]);
		const table1 = l.stitch(r, 0);
		expect(r.entries).toEqual(table1.entries);
		expect(table1.entries).toEqual(table.entries);
	});

	test("cut and stitch restricted negative example", () => {
		const table = new SpliceTable<number, s.DRO<number>>([
			{ i: 0, di: 2, j: 0, dj: 0, replace: [] },
		]);
		const [l, r] = table.cut(1);
		expect(l.entries).toEqual([]);
		const table1 = l.stitch(r, 1);
		expect(r.entries).toEqual(table1.entries);
		expect(table1.entries).toEqual(table.entries);
	});

	test("cut and stitch multi-element replace", () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer(), { maxLength: 8 }),
				fc.integer({ min: 0, max: 8 }),
				(arr, i) => {
					fc.pre(i < arr.length);
					const splice = SpliceTable.fromSplice(0, arr.length, arr);
					const [l, r] = splice.cut(i);
					fc.pre(l.entries.length > 0 && r.entries.length > 0);
					// @ts-expect-error .replace is treated as optional
					const rl = l.entries[0]?.replace ?? [];
					// @ts-expect-error .replace is treated as optional
					const rr = r.entries[0]?.replace ?? [];
					expect([...rl, ...rr]).toEqual(arr);

					const combined = l.stitch(r, i);
					const firstEntry = combined.entries[0] as
						| SpliceEntry<number>
						| undefined;
					expect(firstEntry?.i).toEqual(0);
					expect(firstEntry?.replace ?? []).toEqual(arr);
				},
			),
		);
	});

	test("cut single replace example 1", () => {
		const i = 3;
		const arr = [0, 1, 2, 3, 4, 5];
		const splice = SpliceTable.fromSplice(0, arr.length, arr);
		const [l, r] = splice.cut(i);
		console.log({ l: l.entries, r: r.entries });
	});
});

describe("array apply", () => {
	describe("of constant", () => {
		testCasesArray(p.constant(null));
	});
	describe("of boolean", () => {
		testCasesArray(p.boolean());
	});
	describe("of integer", () => {
		testCasesArray(p.integer({ min: 100, max: 120 }));
	});
	describe("of string", () => {
		testCasesArray(p.string());
	});
});

function testCasesArray<A extends p.AnyHasArbApply>(apply: A) {
	const arr = s.array(apply);
	testCasesPropsApply(arr);

	testSpliceTableInvariants(
		p
			.genValueWith2Changes(arr)
			.filter(
				({ dx1, dx2 }) =>
					dx1 instanceof SpliceTable && dx2 instanceof SpliceTable,
			)
			.chain(({ dx1, dx2 }) =>
				fc.record({
					dx1: fc.constant(dx1 as SpliceTable<s.$T<A>, s.$D<A>>),
					dx2: fc.constant(dx2 as SpliceTable<s.$T<A>, s.$D<A>>),
					table: fc.constant(
						arr.combine(dx1, dx2) as SpliceTable<s.$T<A>, s.$D<A>>,
					),
				}),
			),
		"after combine - splice table invariants",
	);
}

function testSpliceTableInvariants<
	T,
	DT,
	O extends { table: SpliceTable<T, DT> } = { table: SpliceTable<T, DT> },
>(arb: p.Arb<O>, title = "splice table invariants") {
	describe(title, () => {
		test("first entry have i = j", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
					fc.pre(table.entries.length > 0);
					return table.entries[0]!.i === table.entries[0]!.j;
				}),
			);
		});

		test("no negative i", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
					return table.entries.every((x) => x.i >= 0);
				}),
			);
		});

		test("no negative j", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
					return table.entries.every((x) => x.j >= 0);
				}),
			);
		});

		test("i ascending", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
					return asc(table.entries.map((x) => x.i));
				}),
			);
		});

		test("j ascending", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
					return asc(table.entries.map((x) => x.j));
				}),
			);
		});

		test("ascending list of non-overlapping intervals for i", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
					return noOverlapAsc(table.entries.map(({ i, di }) => [i, i + di]));
				}),
			);
		});

		test("change and replace are consistent with dj", () => {
			fc.assert(
				fc.property(arb, ({ table }) => {
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

function propApplyCombine<A extends s.$A, T = s.$T<A>, DT = s.$D<A>>({
	apply: a,
	arr,
	expected,
	left,
	right,
	combined,
}: {
	apply: s.Apply<T, DT>;
	arr: T[];
	left: SpliceTable<T, DT>;
	right: SpliceTable<T, DT>;
	combined: SpliceTable<T, DT>;
	expected?: T[];
}) {
	const actual = combined.apply(arr, a);
	if (expected) {
		expect(actual).toEqual(expected);
	}
	expect(actual).toEqual(right.apply(left.apply(arr, a), a));
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

function testApplyCombine<T, DT>(
	input: T[],
	left: SpliceTable<T, DT>,
	right: SpliceTable<T, DT>,
	apply: s.Apply<T, DT>,
) {
	const combined = left.combine(right, apply);
	const actual = combined.apply(input, apply);
	try {
		expect(actual).toEqual(right.apply(left.apply(input, apply), apply));
	} catch (e) {
		console.error(actual);
		throw e;
	}
}
