import { applyPatches, PatchOp, PatchOpExtended } from "..//patch";

describe("applyPatches", () => {
	describe("swap", () => {
		it("swapping same path is no-op", () => {
			expect(
				applyPatches(
					{
						value: ["a", "b", "c", "d"],
					},
					[
						{
							op: PatchOpExtended.Swap,
							from: ["value", 1],
							path: ["value", 1],
						},
					],
				),
			).toStrictEqual({
				value: ["a", "b", "c", "d"],
			});
		});
		it("should swap two array indexes", () => {
			expect(
				applyPatches(
					{
						value: ["a", "b", "c", "d"],
					},
					[
						{
							op: PatchOpExtended.Swap,
							from: ["value", 1],
							path: ["value", 3],
						},
					],
				),
			).toStrictEqual({
				value: ["a", "d", "c", "b"],
			});
		});
	});

	describe("copy", () => {
		it("should copy and create new key", () => {
			expect(
				applyPatches(
					{
						a: 2,
					},
					[
						{
							op: PatchOpExtended.Copy,
							from: ["a"],
							path: ["b"],
						},
					],
				),
			).toStrictEqual({ a: 2, b: 2 });
		});

		it("should copy to deep path", () => {
			expect(
				applyPatches(
					{
						a: 2,
						b: [
							{
								c: 10,
							},
						],
					},
					[
						{
							op: PatchOpExtended.Copy,
							from: ["a"],
							path: ["b", 0, "c"],
						},
					],
				),
			).toStrictEqual({
				a: 2,
				b: [
					{
						c: 2,
					},
				],
			});
		});

		it("should perform add op on the destination", () => {
			expect(
				applyPatches(
					{
						a: { c: 20 },
						b: [
							{
								c: 10,
							},
						],
					},
					[
						{
							op: PatchOpExtended.Copy,
							from: ["a"],
							path: ["b", "-"],
						},
					],
				),
			).toStrictEqual({
				a: { c: 20 },
				b: [
					{
						c: 10,
					},
					{
						c: 20,
					},
				],
			});
		});

		it("copying same path is no-op", () => {
			expect(
				applyPatches(
					{
						a: 2,
					},
					[
						{
							op: PatchOpExtended.Copy,
							from: ["a"],
							path: ["a"],
						},
					],
				),
			).toStrictEqual({ a: 2 });
		});
	});

	describe("move", () => {
		it("should move to new shallow path", () => {
			expect(
				applyPatches(
					{
						a: 2,
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["a"],
							path: ["b"],
						},
					],
				),
			).toStrictEqual({ b: 2 });
		});

		it("should move to new deep path", () => {
			expect(
				applyPatches(
					{
						a: 2,
						b: {
							c: [10, 20],
						},
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["a"],
							path: ["b", "c", 1],
						},
					],
				),
			).toStrictEqual({ b: { c: [10, 2, 20] } });
		});

		it("should perform remove op on the source", () => {
			expect(
				applyPatches(
					{
						a: { b: 2 },
						c: { d: 3 },
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["a", "b"],
							path: ["c", "e"],
						},
					],
				),
			).toStrictEqual({ a: {}, c: { d: 3, e: 2 } });

			expect(
				applyPatches(
					{
						a: [1, 2],
						b: {},
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["a", 0],
							path: ["b", "c"],
						},
					],
				),
			).toStrictEqual({ a: [2], b: { c: 1 } });
		});

		it("should perform remove op on the source and add op on the destination", () => {
			expect(
				applyPatches(
					{
						a: [1, 2],
						b: [3],
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["a", 0],
							path: ["b", "-"],
						},
					],
				),
			).toStrictEqual({ a: [2], b: [3, 1] });
		});

		it("moving to same path is no-op", () => {
			expect(
				applyPatches(
					{
						a: 2,
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["a"],
							path: ["a"],
						},
					],
				),
			).toStrictEqual({ a: 2 });
		});
	});

	describe("RFC 6902 test cases", () => {
		it("A1 Adding an Object Member", () => {
			expect(
				applyPatches({ foo: "bar" }, [
					{
						op: PatchOp.Add,
						path: ["baz"],
						value: "qux",
					},
				]),
			).toStrictEqual({
				baz: "qux",
				foo: "bar",
			});
		});

		it("A2 Adding an Array Element", () => {
			expect(
				applyPatches({ foo: ["bar", "baz"] }, [
					{
						op: PatchOp.Add,
						path: ["foo", 1],
						value: "qux",
					},
				]),
			).toStrictEqual({
				foo: ["bar", "qux", "baz"],
			});
		});

		it("A3 Removing an Object Member", () => {
			expect(
				applyPatches({ baz: "qux", foo: "bar" }, [
					{
						op: PatchOp.Remove,
						path: ["baz"],
					},
				]),
			).toStrictEqual({
				foo: "bar",
			});
		});

		it("A4 Removing an Array Element", () => {
			expect(
				applyPatches({ foo: ["bar", "qux", "baz"] }, [
					{
						op: PatchOp.Remove,
						path: ["foo", 1],
					},
				]),
			).toStrictEqual({
				foo: ["bar", "baz"],
			});
		});

		it("A5 Replacing a Value", () => {
			expect(
				applyPatches(
					{
						baz: "qux",
						foo: "bar",
					},
					[
						{
							op: PatchOp.Replace,
							path: ["baz"],
							value: "boo",
						},
					],
				),
			).toStrictEqual({
				baz: "boo",
				foo: "bar",
			});
		});

		it("A6 Moving a Value", () => {
			expect(
				applyPatches(
					{
						foo: {
							bar: "baz",
							waldo: "fred",
						},
						qux: {
							corge: "grault",
						},
					},
					[
						{
							op: PatchOpExtended.Move,
							from: ["foo", "waldo"],
							path: ["qux", "thud"],
						},
					],
				),
			).toStrictEqual({
				foo: {
					bar: "baz",
				},
				qux: {
					corge: "grault",
					thud: "fred",
				},
			});
		});

		it("A7 Moving an Array Element", () => {
			expect(
				applyPatches({ foo: ["all", "grass", "cows", "eat"] }, [
					{
						op: PatchOpExtended.Move,
						from: ["foo", 1],
						path: ["foo", 3],
					},
				]),
			).toStrictEqual({ foo: ["all", "cows", "eat", "grass"] });
		});

		it("A10 Adding a Nested Member Object", () => {
			expect(
				applyPatches({ foo: "bar" }, [
					{ op: PatchOp.Add, path: ["child"], value: { grandchild: {} } },
				]),
			).toStrictEqual({ foo: "bar", child: { grandchild: {} } });
		});

		it("A12 Adding to a Nonexistent Target", () => {
			expect(() =>
				applyPatches({ foo: "bar" }, [
					{ op: PatchOp.Add, path: ["baz", "bat"], value: "qux" },
				]),
			).toThrow(Error);
		});

		it("A16 Adding an Array Value", () => {
			expect(
				applyPatches({ foo: ["bar"] }, [
					{ op: PatchOp.Add, path: ["foo", "-"], value: ["abc", "def"] },
				]),
			).toStrictEqual({
				foo: ["bar", ["abc", "def"]],
			});
		});
	});
});
