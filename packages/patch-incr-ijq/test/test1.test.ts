import { PatchBuilder } from "patch-incr/patch";
import * as Arr from "@/array";
import * as A from "@/arrow";
import * as Stream from "@/arrow";
import * as C from "@/context";
import * as AP from "@/pair";
import { Pipe } from "@/pipe";
import type { EmptyCtx } from "@/type";
import { propIjqPatchCoherentNoCtx } from "./helpers";

interface Item {
	done: boolean;
	id: number;
	text: string;
}

type Input = [Item[], boolean];
const items: Item[] = [
	{ done: false, id: 10, text: "Item 1" },
	{ done: true, id: 20, text: "Item 2" },
	{ done: true, id: 30, text: "Item 3" },
	{ done: false, id: 40, text: "Item 4" },
	{ done: false, id: 50, text: "Item 5" },
	{ done: true, id: 60, text: "Item 6" },
];

// equivalent to `piped` below
const _filterIsDone = C.assignCtx<Input>()("isDone", AP.snd())(
	A.compose(
		AP.fst(),
		Arr.collect(Arr.map(Arr.select(({ done }, { isDone }) => done === isDone))),
	),
);

// jq code: .[1] as $isDone | [.[0] | map(select(.done == $isDone))]
const piped = new Pipe<Input>()
	.$("isDone", AP.snd())
	.pipe(AP.fst())
	.stream()
	.pipe(Arr.select(({ done }, { isDone }) => done === isDone))
	.collect()
	.build();

describe("piped filter example", () => {
	const input1: Input = [items, true];
	const pair1: [Input, EmptyCtx] = [input1, {} as EmptyCtx];

	it("should return correct value", () => {
		const fn = A.toIF(piped);
		const y = fn.evaluate(pair1);
		// stream with only 1 element
		expect(y).toStrictEqual([[items[1], items[2], items[5]]]);
	});

	describe("patch coherent", () => {
		it("add item is done", () => {
			const dPair1 = PatchBuilder.empty<Input>()
				.add([0, 1], { done: true, id: 50, text: "Added" } as Item)
				.build();
			propIjqPatchCoherentNoCtx([items, true] as Input, dPair1, piped);
		});

		it("add item is not done", () => {
			const dPair1 = PatchBuilder.empty<Input>()
				.add([0, 1], { done: false, id: 50, text: "Added" } as Item)
				.build();
			propIjqPatchCoherentNoCtx([items, true] as Input, dPair1, piped);
		});

		it("change item is done to false", () => {
			const dPair1 = PatchBuilder.empty<Input>()
				.add([0, 1, "done"], false)
				.build();
			propIjqPatchCoherentNoCtx([items, true] as Input, dPair1, piped);
		});

		it("change item is done to true", () => {
			const dPair1 = PatchBuilder.empty<Input>()
				.add([0, 3, "done"], true)
				.build();
			propIjqPatchCoherentNoCtx([items, true] as Input, dPair1, piped);
		});

		it("isDone filter change", () => {
			const dPair1 = PatchBuilder.empty<Input>().replace([0, 1], false).build();
			propIjqPatchCoherentNoCtx([items, true] as Input, dPair1, piped);
		});
	});
});

describe("Pair", () => {
	it("pair performs Cartesian product", () => {
		type I = WeakKey;
		expect(
			A.apply(
				A.pair<I, number, number>(A.of(1, 2, 3), A.of(10, 20, 30)),
				{} as I,
				{} as EmptyCtx,
			),
		).toEqual([
			[1, 10],
			[1, 20],
			[1, 30],
			[2, 10],
			[2, 20],
			[2, 30],
			[3, 10],
			[3, 20],
			[3, 30],
		]);
	});
});

describe("Array", () => {
	it("collectMany joins arrays", () => {
		type I = never;
		expect(
			A.apply(
				Arr.collectMany<I, number>(
					Stream.of(1, 2, 3),
					Stream.of(10, 20, 30),
					Stream.constant(40),
				),
				{} as I,
				{} as EmptyCtx,
			),
		).toEqual([[1, 2, 3, 10, 20, 30, 40]]);
	});
});
