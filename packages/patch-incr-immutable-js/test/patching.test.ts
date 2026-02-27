import I from "immutable";
import { applyPatches, PatchBuilder } from "patch-incr/patch";
import "@/";
import { IndexEnd } from "patch-incr/patchSchema/types";

describe("applyPatches on Lists", () => {
	const xs = I.List([1, 2, 3]);
	it("should insert element, displacing existing", () => {
		const patched = applyPatches(xs, PatchBuilder.empty().add([1], 4).build());
		expect([...patched]).toStrictEqual([1, 4, 2, 3]);
	});

	it("should insert element to the end", () => {
		const patched = applyPatches(
			xs,
			PatchBuilder.empty().add([IndexEnd], 4).build(),
		);
		expect([...patched]).toStrictEqual([1, 2, 3, 4]);
	});

	it("should remove element in the middle", () => {
		const patched = applyPatches(xs, PatchBuilder.empty().remove([1]).build());
		expect([...patched]).toStrictEqual([1, 3]);
	});

	it("should remove element in the end", () => {
		const patched = applyPatches(
			xs,
			PatchBuilder.empty().remove([IndexEnd]).build(),
		);
		expect([...patched]).toStrictEqual([1, 2]);
	});

	it("should replace element", () => {
		const patched = applyPatches(
			xs,
			PatchBuilder.empty().replace([1], 5).build(),
		);
		expect([...patched]).toStrictEqual([1, 5, 3]);
	});

	it("should apply internal patches on List", () => {
		const list = I.List([
			{ x: 1, y: 2 },
			{ x: 2, y: 3 },
		]);
		const patched = applyPatches(
			list,
			PatchBuilder.empty()
				.replace([0, "y"], -2)
				.add([0, "z"], 9)
				.remove([1, "y"])
				.build(),
		);
		expect([...patched]).toStrictEqual([{ x: 1, y: -2, z: 9 }, { x: 2 }]);
	});
});

describe("applyPatches on Maps", () => {
	const map = I.Map([
		["key1", 1],
		["key2", 2],
		["key3", 3],
	]);
	it("should add new key-value pair", () => {
		const patched = applyPatches(
			map,
			PatchBuilder.empty().add(["key4"], 4).build(),
		);
		expect([...patched.entries()]).toStrictEqual([
			["key1", 1],
			["key2", 2],
			["key3", 3],
			["key4", 4],
		]);
	});

	it("should replace existing key-value pair with add", () => {
		const patched = applyPatches(
			map,
			PatchBuilder.empty().add(["key2"], 4).build(),
		);
		expect([...patched.entries()]).toStrictEqual([
			["key1", 1],
			["key2", 4],
			["key3", 3],
		]);
	});

	it("should add new key-value pair with replace", () => {
		const patched = applyPatches(
			map,
			PatchBuilder.empty().replace(["key4"], 4).build(),
		);
		expect([...patched.entries()]).toStrictEqual([
			["key1", 1],
			["key2", 2],
			["key3", 3],
			["key4", 4],
		]);
	});

	it("should replace existing key-value pair with replace", () => {
		const patched = applyPatches(
			map,
			PatchBuilder.empty().replace(["key2"], 4).build(),
		);
		expect([...patched.entries()]).toStrictEqual([
			["key1", 1],
			["key2", 4],
			["key3", 3],
		]);
	});

	it("should remove existing key-value pair", () => {
		const patched = applyPatches(
			map,
			PatchBuilder.empty().remove(["key2"]).build(),
		);
		expect([...patched.entries()]).toStrictEqual([
			["key1", 1],
			["key3", 3],
		]);
	});

	it("should apply internal patches on Map", () => {
		const list = I.Map([
			["key1", { x: 1, y: 2 }],
			["key2", { x: 2, y: 3 }],
		]);
		const patched = applyPatches(
			list,
			PatchBuilder.empty()
				.replace(["key1", "y"], -2)
				.add(["key1", "z"], 9)
				.remove(["key2", "y"])
				.build(),
		);
		expect([...patched.entries()]).toStrictEqual([
			["key1", { x: 1, y: -2, z: 9 }],
			["key2", { x: 2 }],
		]);
	});

	it("should apply internal patches on nested Map", () => {
		const list = I.Map([
			["key1", I.Map({ x: 1, y: 2 })],
			["key2", I.Map({ x: 2, y: 3 })],
		]);
		const patched: typeof list = applyPatches(
			list,
			PatchBuilder.empty()
				.replace(["key1", "y"], -2)
				.add(["key1", "z"], 9)
				.remove(["key2", "y"])
				.build(),
		);
		expect(
			[...patched.entries()].map(([k, v]) => [k, v.toObject()]),
		).toStrictEqual([
			["key1", { x: 1, y: -2, z: 9 }],
			["key2", { x: 2 }],
		]);
	});
});
