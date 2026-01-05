import { applyPatches, type Patches, PatchOp } from "patch-incr/patch";
import { NOTHING, produceWithPatches } from "../src";
import { isDraft } from "../src/proxy";

describe("produceWithPatches", () => {
	describe("two-argument function", () => {
		describe("recipe return value", () => {
			it("should not replace root with void return", () => {
				expect(
					produceWithPatches(
  					[1] as number[] | undefined,
						(_draft) => {
							return;
						},
					),
				).toStrictEqual([[1], []]);
			});

			it("should replace root with null return", () => {
				expect(
					produceWithPatches(
  					[1] as number[] | null,
						(_draft) => {
							return null;
						},
					),
				).toStrictEqual([
					null,
					[{ op: PatchOp.Replace, path: [], value: null }],
				]);
			});

			it("should replace root with undefined with NOTHING", () => {
				expect(
					produceWithPatches(
  					[1] as number[] | undefined,
						(_draft) => {
							return NOTHING;
						},
					),
				).toStrictEqual([
					undefined,
					[{ op: PatchOp.Replace, path: [], value: undefined }],
				]);
			});
		});
		describe("changing object", () => {
			const before = {
				a: 1 as number | undefined,
				b: "test",
				c: [1, 2],
				d: [{ x: 5 }, { x: 6 }],
			};
			let after: typeof before;
			let patches: Patches<typeof before>;
			beforeEach(() => {
				[after, patches] = produceWithPatches<typeof before>(before, (draft) => {
					draft.b = "xyz";
					draft.a = 5;
					draft.d.shift();
					draft.c.splice(0, 2);
					delete draft.a;
				});
			});
			it("should not return a draft for the after-value", () => {
				expect(isDraft(after)).toBe(false);
			});
			it("should return the correct after-value", () => {
				expect(after).toStrictEqual({
					b: "xyz",
					c: [],
					d: [{ x: 6 }],
				});
			});

			it("should return the correct patches", () => {
				expect(applyPatches(before, patches)).toStrictEqual(after);
			});

			it("should keep before unchanged", () => {
				expect(before).toStrictEqual({
					a: 1,
					b: "test",
					c: [1, 2],
					d: [{ x: 5 }, { x: 6 }],
				});
			});
		});
	});

	describe("one-argument function", () => {
		it("should curry the second argument", () => {
			const before = { x: [1] };
			const [after, patches] = produceWithPatches<{ x: number[] }>((draft) => {
				draft.x.push(2);
			})(before);

			expect(after).toStrictEqual({ x: [1, 2] });
			expect(applyPatches(before, patches)).toStrictEqual({ x: [1, 2] });
		});
	});
});
