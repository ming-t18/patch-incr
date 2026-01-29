import { PatchBuilder } from "patch-incr/patch";
import * as Arr from "../src/array";
import * as Dv from "../src/dv";
import * as Obj from "../src/object";
import * as Pt from "../src/point";
import type { DV } from "../src/types";

describe("map", () => {
	it("test", () => {
		const values = [
			{ xs: [1, 4], y: 2 },
			{ xs: [5, 7], y: -3 },
			{ xs: [10, 2, 30], y: -5 },
			{ xs: [-4, 6], y: 6 },
		];
		const dValues = PatchBuilder.empty<typeof values>()
			.replace([1, "xs", 9], 6)
			.add([0], { x: 4, y: 3 })
			.remove([1])
			.build();
		const pValues = Dv.create(values, dValues);
		const mapper = Arr.map((o: DV<(typeof values)[number]>) =>
			Obj.assign(Dv.create({ hello: "world" }), {
				y1: Obj.access(o, "y"),
				xs1: Obj.access(o, "xs"),
			}),
		);
		const pMapped = mapper(pValues);
		console.log(pMapped);
	});

	it("test filtering", () => {
		const items = [
			{ id: 10, done: true, text: "Item 1" },
			{ id: 20, done: false, text: "Item 2" },
			{ id: 30, done: false, text: "Item 3" },
			{ id: 40, done: true, text: "Test" },
		];
		const dItems = PatchBuilder.empty<typeof items>()
			//.replace([0, "done"], false)
			//.remove([2])
			.build();
		const pItems = Dv.create(items, dItems);
		type Item = (typeof items)[number];
		const toFind = Dv.createReplace(30, 10);
		console.log(
			Pt.bimap((a: number, b: number) => a === b)(Pt.create(10, 10), toFind),
		);
		const mapper = Arr.map((item: DV<Item>) =>
			Obj.assign(item, {
				isFound: Pt.bimap((a: number, b: number) => a === b)(
					Obj.access(item, "id"),
					toFind,
				),
			}),
		);
		console.log(mapper(pItems));
	});
});
