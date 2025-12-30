import { applyPatches, PatchOp, PatchOpExtended } from "../patch";
import { IndexEnd } from "../patchSchema/types";

describe("applyPatches", () => {
	describe("basic patch operations", () => {
		describe("PatchOp.Replace", () => {
			it("should replace root", () => {
				expect(
					applyPatches(
						{
							a: 2,
						},
						[
							{
								op: PatchOp.Replace,
								path: [],
								value: "test",
							},
						],
					),
				).toStrictEqual("test");
			});

			it("should replace top-level field", () => {
				expect(
					applyPatches(
						{
							a: 2,
						},
						[
							{
								op: PatchOp.Replace,
								path: ["a"],
								value: "test",
							},
						],
					),
				).toStrictEqual({ a: "test" });
			});

			it("should replace nested field", () => {
				expect(
					applyPatches(
						{
							a: [
								{ b: { c: [4, 5] } },
								{ b: { c: [6, 7] } },
								{ b: { c: [8, 9] } },
							],
						},
						[
							{
								op: PatchOp.Replace,
								path: ["a", 1, "b", "c", 1],
								value: "test",
							},
						],
					),
				).toStrictEqual({
					a: [
						{ b: { c: [4, 5] } },
						{ b: { c: [6, "test"] } },
						{ b: { c: [8, 9] } },
					],
				});
			});
		});

		describe("PatchOp.Add", () => {
			it("should replace root through add", () => {
				expect(
					applyPatches(undefined, [
						{
							op: PatchOp.Add,
							path: [],
							value: "test",
						},
					]),
				).toStrictEqual("test");
			});

			it("should add array element to the end", () => {
				expect(
					applyPatches(
						[1, 2],
						[
							{
								op: PatchOp.Add,
								path: [IndexEnd],
								value: "test",
							},
						],
					),
				).toStrictEqual([1, 2, "test"]);
			});

			it("should add array element in the middle", () => {
				expect(
					applyPatches(
						[1, 2, 3],
						[
							{
								op: PatchOp.Add,
								path: [1],
								value: "test",
							},
						],
					),
				).toStrictEqual([1, "test", 2, 3]);
			});

			it("should add array element in nested object", () => {
				expect(
					applyPatches(
						{
							a: { b: [1, 2, 3] },
						},
						[
							{
								op: PatchOp.Add,
								path: ["a", "b", 1],
								value: "test",
							},
						],
					),
				).toStrictEqual({ a: { b: [1, "test", 2, 3] } });
			});
		});

		describe("PatchOp.Remove", () => {
			it("should replace root through remove", () => {
				expect(
					applyPatches("test", [
						{
							op: PatchOp.Remove,
							path: [],
						},
					]),
				).toStrictEqual(undefined);
			});

			it("should remove first element", () => {
				expect(
					applyPatches(
						[1, 2],
						[
							{
								op: PatchOp.Remove,
								path: [0],
							},
						],
					),
				).toStrictEqual([2]);
			});

			it("should remove last element", () => {
				expect(
					applyPatches(
						[1, 2],
						[
							{
								op: PatchOp.Remove,
								path: [1],
							},
						],
					),
				).toStrictEqual([1]);
			});

			it("should remove array element in the middle", () => {
				expect(
					applyPatches(
						[1, 2, 3],
						[
							{
								op: PatchOp.Remove,
								path: [1],
							},
						],
					),
				).toStrictEqual([1, 3]);
			});

			it("should remove array element in nested object", () => {
				expect(
					applyPatches(
						{
							a: { b: [1, 2, 3] },
						},
						[
							{
								op: PatchOp.Remove,
								path: ["a", "b", 1],
							},
						],
					),
				).toStrictEqual({ a: { b: [1, 3] } });
			});
		});

		describe("PatchOpExtended.Swap", () => {
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

		describe("PatchOpExtended.Copy", () => {
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

		describe("PatchOpExtended.Move", () => {
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

	describe("does not mutate the input", () => {
		const getInitial = () => ({
			a: {
				b: [{ c: 1 }, { c: 2 }, { c: 3 }],
			},
			x: { p: 1 },
		});

		it("should handle empty patches", () => {
			const before = getInitial();
			const after = applyPatches(before, []);
			expect(after).toEqual(getInitial());
			expect(before).toEqual(getInitial());
		});

		it("should handle multiple patch operations", () => {
			const before = getInitial();
			const after = applyPatches(before, [
				{
					op: PatchOp.Remove,
					path: ["x", "p"],
				},
				{
					op: PatchOp.Add,
					path: ["x", "q"],
					value: "test",
				},
				{
					op: PatchOp.Remove,
					path: ["a", "b", 2],
				},
				{
					op: PatchOp.Replace,
					path: ["a", "b", 1, "c"],
					value: 4,
				},
				{
					op: PatchOp.Add,
					path: ["a", "b", 0],
					value: { c: 0 },
				},
				{
					op: PatchOp.Replace,
					path: ["a", "b", 0],
					value: { c: 2 },
				},
			]);
			expect(before).toEqual(getInitial());
			expect(after).toEqual({
				a: {
					b: [{ c: 2 }, { c: 1 }, { c: 4 }],
				},
				x: { q: "test" },
			});
		});

		describe("aliasing", () => {
			const getInitialAliased = () => {
				const aliased = { c: 1 };
				return {
					x: aliased,
					a: [aliased, aliased, { c: 1 }, { c: 2 }],
				};
			};

			it("should handle multiple patch operations", () => {
				const before = getInitialAliased();
				const after = applyPatches(before, [
					{
						op: PatchOp.Replace,
						path: ["x", "c"],
						value: 10,
					},
					{
						op: PatchOp.Replace,
						path: ["a", 1, "c"],
						value: 20,
					},
				]);
				expect(before).toEqual(getInitialAliased());
				expect(after).toEqual({
					x: { c: 10 },
					a: [{ c: 1 }, { c: 20 }, { c: 1 }, { c: 2 }],
				});
			});
		});
	});
});
