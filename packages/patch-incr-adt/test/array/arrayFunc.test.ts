// biome-ignore-all lint/style/noNonNullAssertion: for checked array access
import { describe, expect, test } from "bun:test";
import * as f from "@/funcs";
import * as s from "@/index";
import * as p from "@/props";
import { testCasesIF } from "../fastCheck/testPropsIF.test";

describe("csum", () => {
	const arrInt = s.array(p.integer());
	testCasesIF(s.FArray.fromArray(arrInt).csum((x) => x, 0, p.integer()));
});

describe("map", () => {
	describe("map integer", () => {});
	const arrInt = s.array(p.integer());
	testCasesIF(
		s.FArray.fromArray(arrInt).map(
			f.atomicFuncA(arrInt.inner, arrInt.inner, (x) => x + 1),
		),
	);
});

describe("flatten", () => {
	const arr = s.array(p.integer({ min: 0, max: 2 }));
	const arr2Int = s.array(arr);
	const flatten = s.FArray.fromArray(arr).flat();
	testCasesIF(flatten);

	describe("forward examples", () => {
		const x: s.$T<typeof arr2Int> = [
			[1, 2],
			[3, 4, 5, 6],
			[7, 8],
			[9, 10],
		];
		test("forward splice same", () => {
			const dx = s.SpliceTable.fromSplice<s.$T<typeof arr>, s.$D<typeof arr>>(
				1,
				2,
				[[-1, -2], [-3]],
			);
			const yr = flatten.evaluate(x);
			const dyr = flatten.forward(x, dx, yr);
			const y1 = flatten.output.apply(yr, dyr)[0];
			const y1e = flatten.evaluate(arr2Int.apply(x, dx))[0];
			expect(y1e).toEqual(y1);
			expect(y1e).toEqual([1, 2, -1, -2, -3, 9, 10]);
		});
		test("forward splice deleting", () => {
			const dx = s.SpliceTable.fromSplice<s.$T<typeof arr>, s.$D<typeof arr>>(
				1,
				2,
				[],
			);
			const yr = flatten.evaluate(x);
			const dyr = flatten.forward(x, dx, yr);
			const y1 = flatten.output.apply(yr, dyr)[0];
			const y1e = flatten.evaluate(arr2Int.apply(x, dx))[0];
			expect(y1e).toEqual(y1);
		});
		test("forward replace specific array", () => {
			const dx = s.SpliceTable.fromChange<s.$T<typeof arr>, s.$D<typeof arr>>(
				1,
				s.makeReplaceOnly([-1, -2]),
			);
			const yr = flatten.evaluate(x);
			const dyr = flatten.forward(x, dx, yr);
			const y1 = flatten.output.apply(yr, dyr)[0];
			const y1e = flatten.evaluate(arr2Int.apply(x, dx))[0];
			expect(y1e).toEqual(y1);
			expect(y1e).toEqual([1, 2, -1, -2, 7, 8, 9, 10]);
		});
		test("forward internal change replace single", () => {
			const dx = s.SpliceTable.fromChange<s.$T<typeof arr>, s.$D<typeof arr>>(
				1,
				s.SpliceTable.fromChange<number, s.DRO<number>>(
					3,
					s.makeReplaceOnly(-1),
				),
			);
			const yr = flatten.evaluate(x);
			const dyr = flatten.forward(x, dx, yr);
			const y1 = flatten.output.apply(yr, dyr)[0];
			const y1e = flatten.evaluate(arr2Int.apply(x, dx))[0];
			expect(y1e).toEqual(y1);
			expect(y1e).toEqual([1, 2, 3, 4, 5, -1, 7, 8, 9, 10]);
		});
		test("forward internal change splicing internal array", () => {
			const dx = s.SpliceTable.fromChange<s.$T<typeof arr>, s.$D<typeof arr>>(
				1,
				s.SpliceTable.fromSplice<number, s.DRO<number>>(0, 2, []),
			);
			const yr = flatten.evaluate(x);
			const dyr = flatten.forward(x, dx, yr);
			const y1 = flatten.output.apply(yr, dyr)[0];
			const y1e = flatten.evaluate(arr2Int.apply(x, dx))[0];
			expect(y1e).toEqual(y1);
			expect(y1e).toEqual([1, 2, 5, 6, 7, 8, 9, 10]);
		});
	});
});
