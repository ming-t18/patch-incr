// biome-ignore-all lint/style/noNonNullAssertion: for checked array access
import { describe, expect, test } from "bun:test";
import * as f from "@/funcs";
import * as s from "@/index";
import { Arr } from "@/modules";
import * as p from "@/props";
import { testCasesIF } from "../fastCheck/testPropsIF.test";

describe("csum", () => {
	const arrInt = s.array(p.integer());
	testCasesIF(Arr.csum(arrInt)((x) => x, 0, p.integer()));
});

describe("map", () => {
	describe("map integer", () => {
		const arrInt = s.array(p.integer());
		testCasesIF(
			Arr.map(arrInt)(f.atomicFuncA(arrInt.inner, arrInt.inner, (x) => x + 1)),
		);
	});

	describe("map either", () => {
		const arrPair = s.array(s.either(p.integer(), p.string()));
		const ce = s.Either.comm(arrPair.inner);
		testCasesIF(Arr.map(arrPair)(ce));
	});

	describe("map pair", () => {
		const arrPair = s.array(s.pair(p.integer(), p.string()));
		testCasesIF(Arr.map(arrPair)(s.Pair.snd(arrPair.inner)));
	});
});

describe("flatten", () => {
	describe("of number", () => {
		const arr = s.array(p.integer({ min: 0, max: 100 }));
		const arr2Int = s.array(arr);
		const flatten = Arr.flat(arr2Int);
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

	describe("of record", () => {
		const arr = s.array(
			s.record({ int: p.integer({ min: 0, max: 100 }), str: p.string() }),
		);
		const flatten = Arr.flat(s.array(arr));
		testCasesIF(flatten);
	});

	describe("of either", () => {
		const arr = s.array(s.either(p.integer({ min: 0, max: 100 }), p.string()));
		const flatten = Arr.flat(s.array(arr));
		testCasesIF(flatten);
	});

	describe("of pair", () => {
		const arr = s.array(s.pair(p.integer({ min: 0, max: 100 }), p.string()));
		const flatten = Arr.flat(s.array(arr));
		testCasesIF(flatten);
	});
});

describe("flatMap", () => {
	describe("of singleton", () => {
		const value = s.pair(p.string(), p.boolean());
		const fm = Arr.flatMap(s.array(value))(Arr.singleton(value));
		testCasesIF(fm);
	});

	describe("of pair", () => {
		const rec = s.pair(p.string(), s.array(s.pair(p.integer(), p.boolean())));
		const fm = Arr.flatMap(s.array(rec))(s.Pair.snd(rec));
		testCasesIF(fm);
	});

	describe("of record", () => {
		const rec = s.record({
			a: p.string(),
			b: s.array(s.pair(p.integer(), p.boolean())),
		});
		const fm = Arr.flatMap(s.array(rec))(new f.FRecord(rec).get("b"));
		testCasesIF(fm);
	});
});

describe("distr", () => {
	describe("(integer, boolean)", () => {
		testCasesIF(new s.FArray(p.integer()).distr(p.boolean()));
	});
	describe("(pair, pair)", () => {
		testCasesIF(
			new s.FArray(s.pair(p.string(), p.integer())).distr(
				s.pair(p.boolean(), p.boolean()),
			),
		);
	});
});

describe("distrMap", () => {
	describe("(pair, integer)", () => {
		const inputPair = s.pair(p.integer(), p.integer());
		const ctx = p.integer();
		const combinedPair = s.pair(inputPair, ctx);
		testCasesIF(
			Arr.distrMap(s.array(inputPair), ctx)(s.Pair.fst(combinedPair)),
		);
	});
});
