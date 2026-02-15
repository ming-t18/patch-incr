import { applyPatches, PatchBuilder } from "patch-incr/patch";
import * as Arr from "../src/array";
import * as A from "../src/arrow";
import * as Stream from "../src/arrow";
import * as C from "../src/context";
import * as AP from "../src/pair";
import { Pipe } from "../src/pipe";
import * as R from "../src/recurse";
import type { EmptyCtx } from "../src/type";
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
const filterIsDone = C.assignCtx<Input>()("isDone", AP.snd())(
	A.compose(
		AP.fst(),
		Arr.collect(Arr.map(Arr.select(({ done }, { isDone }) => done === isDone))),
	),
);
// jq code: .[1] as $isDone | [.[0] | map(select(.done == $isDone))]
const piped = new Pipe<[Item[], boolean]>()
	.$("isDone", AP.snd())
	.pipe(AP.fst())
	.stream()
	.pipe(Arr.select(({ done }, { isDone }) => done === isDone))
	.collect()
	.build();

describe("Arrow", () => {
	it("test1", () => {
		const fn = A.toIF(filterIsDone);
		const input1: Input = [items, true];
		console.log(JSON.stringify(input1));
		const pair1: [Input, EmptyCtx] = [input1, {} as EmptyCtx];
		const y = fn.evaluate(pair1);
		console.log(y);
		const dPair1 = PatchBuilder.empty<typeof pair1>()
			.replace([0, 1], false)
			.build();
		const dy1 = fn.forward(pair1, dPair1, y);
		const y2 = applyPatches(y, dy1);
		console.log(y2);
	});

	it("test1 using builder", () => {
		const fn = A.toIF(piped);
		const input1: Input = [items, true];
		console.log(JSON.stringify(input1));
		const pair1: [Input, EmptyCtx] = [input1, {} as EmptyCtx];
		const y = fn.evaluate(pair1);
		console.log(y);
		const dPair1 = PatchBuilder.empty<typeof pair1>()
			.replace([0, 1], false)
			.build();
		const dy1 = fn.forward(pair1, dPair1, y);
		const y2 = applyPatches(y, dy1);
		console.log(y2);
	});

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
