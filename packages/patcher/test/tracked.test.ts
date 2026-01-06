/** biome-ignore-all lint/style/noNonNullAssertion: for array access */
import { PatchBuilder } from "patch-incr/patch";
import {
	createDraft,
	current,
	currentPath,
	finishDraft,
	originalRoot,
	patchesOnRoot,
} from "../src";

const getOriginal = () => ({
	a: 10,
	b: "test" as string | undefined,
	c: [
		{ x: 1, y: [3] },
		{ x: 2, y: [4] },
	],
});

type Value = ReturnType<typeof getOriginal>;

const makeSimpleChanges = (draft: Value) => {
	draft.a = 20;
	draft.c[1]!.y = [100, 200];
	delete draft.b;
};

describe("tracked mode", () => {
	let value: Value;
	let draft: Value;

	beforeEach(() => {
		value = getOriginal();
		draft = createDraft(value);
	});

	describe("accessing a tracked object", () => {
		describe("accessing values from object", () => {
			it("should return the value for primitive value", () => {
				expect(draft.a).toBe(10);
				expect(draft.b).toBe("test");
			});

			it("should access nested primitive value", () => {
				expect(draft.c[0]!.x).toBe(1);
				expect(draft.c[0]!.y[0]).toBe(3);
			});

			it("should return undefined for non-existent value", () => {
				// @ts-expect-error intentional
				expect(draft.d).toBeUndefined();
			});

			it("should return undefined for non-existent Symbol key", () => {
				// @ts-expect-error intentional
				expect(draft[Symbol.asyncDispose]).toBeUndefined();
			});

			it("should return undefined for non-existent number key", () => {
				// @ts-expect-error intentional
				expect(draft[0]).toBeUndefined();
			});
		});

		describe("accessing values from Array", () => {
			it("should have length being a number", () => {
				expect(typeof draft.c.length).toBe("number");
			});

			it("should have the correct array length", () => {
				expect(draft.c.length).toBe(2);
			});

			it("should access array value by index to get a ref to it", () => {
				expect(typeof draft.c[0]).toBe("object");
			});
		});
	});

	describe("Object.keys and 'in' operator on drafts", () => {
		it("should return a list of keys in original order", () => {
			expect(Object.keys(draft)).toStrictEqual(["a", "b", "c"]);
		});

		it("should return correct results for 'in' operator", () => {
			expect("x" in draft).toBe(false);
			expect("a" in draft).toBe(true);
			expect("b" in draft).toBe(true);
			expect("c" in draft).toBe(true);
		});

		it("should return correct Object.keys for arrays", () => {
			expect(Object.keys(createDraft([1, 2, 3]))).toEqual(["0", "1", "2"]);
		});
	});

	describe("currentPath", () => {
		it("should get path to root", () => {
			expect(currentPath(draft)).toStrictEqual([]);
		});

		it("should get path to array field", () => {
			expect(currentPath(draft.c)).toStrictEqual(["c"]);
		});

		it("should get path to an element of array of object with index being a number", () => {
			expect(currentPath(draft.c[1])).toStrictEqual(["c", 1]);
		});

		it("should get path to a non-primitive element of array of object with index being a number", () => {
			expect(currentPath(draft.c[1]!.y)).toStrictEqual(["c", 1, "y"]);
		});
	});

	describe("simple operations on object", () => {
		beforeEach(() => {
			makeSimpleChanges(draft);
		});

		describe("finishDraft", () => {
			beforeEach(() => {
				finishDraft(draft);
			});

			it("should throw on non-drafts", () => {
				expect(() => finishDraft(null)).toThrow();
				expect(() => finishDraft(getOriginal())).toThrow();
			});

			it("should throw on already finished draft", () => {
				expect(() => finishDraft(draft)).toThrow();
			});

			it("should invalidate originalRoot", () => {
				expect(originalRoot(draft)).toBeUndefined();
			});

			it("should invalidate current", () => {
				expect(current(draft)).toBeUndefined();
			});

			it("should invalidate patchesOnRoot", () => {
				expect(patchesOnRoot(draft)).toBeUndefined();
			});
		});

		describe("originalRoot", () => {
			it("should return undefined for non-drafts", () => {
				expect(originalRoot({})).toBeUndefined();
			});

			it("should preserve by reference", () => {
				expect(originalRoot(draft)).toBe(value);
			});

			it("should preserve value by deep equal with original value", () => {
				expect(originalRoot(draft)).toStrictEqual(getOriginal());
			});
		});

		describe("current", () => {
			it("should return undefined for non-drafts", () => {
				expect(current({})).toBeUndefined();
			});

			it("should reflect new changes in current(draft)", () => {
				expect(current(draft)).toStrictEqual({
					a: 20,
					c: [
						{ x: 1, y: [3] },
						{ x: 2, y: [100, 200] },
					],
				});
			});
		});

		describe("patchesOnRoot", () => {
			it("should return a list of patches in order of modifications", () => {
				expect(patchesOnRoot(draft)).toStrictEqual(
					PatchBuilder.empty()
						.replace(["a"], 20)
						.replace(["c", 1, "y"], [100, 200])
						.remove(["b"])
						.build(),
				);
			});

			it("should not generate patches for assigning into original value", () => {
				const list = [2];
				const draft1 = createDraft({ x: 1, y: list, z: NaN });
				draft1.x = 1;
				draft1.y = list;
				draft1.z = 0.0 / 0.0;

				// no change for these assignments
				expect(patchesOnRoot(draft1)).toStrictEqual([]);
			});
		});
	});

	describe("callback values are treated as primitives", () => {
		const func = (x: number) => 2 + x;
		it("should get callbacks in objects", () => {
			const draft1 = createDraft({ func });
			expect(typeof draft1.func).toBe("function");
			expect(draft1.func).toBe(func);
			expect(draft1.func(1)).toBe(3);
		});

		it("should get callbacks in arrays", () => {
			const draft1 = createDraft({ arr: [func] });
			expect(typeof draft1.arr[0]).toBe("function");
			expect(draft1.arr[0]).toBe(func);
			expect(draft1.arr[0]!(1)).toBe(3);
		});

		it("should get callbacks in Maps", () => {
			const draft1 = createDraft({ map: new Map([["func", func]]) });
			expect(typeof draft1.map.get("func")!).toBe("function");
			expect(draft1.map.get("func")!).toBe(func);
			expect(draft1.map.get("func")!(1)).toBe(3);
		});
	});

	describe("with aliasing", () => {
		it("should not update original value", () => {
			draft.c[1] = draft.c[0]!;
			draft.c[1]!.x = 5;
			draft.c[1]!.y = [100];
			expect(current(draft.c)).toStrictEqual([
				{ x: 1, y: [3] },
				{ x: 5, y: [100] },
			]);
		});
	});

	describe("array operations", () => {
		describe("push", () => {
			it("should be a function", () => {
				expect(typeof draft.c.push).toBe("function");
			});

			it("should add to the end", () => {
				draft.c.push({ x: 100, y: [10, 20] });
				expect(current(draft.c)).toStrictEqual([
					{ x: 1, y: [3] },
					{ x: 2, y: [4] },
					{ x: 100, y: [10, 20] },
				]);
			});
		});

		describe("pop", () => {
			it("should be a function", () => {
				expect(typeof draft.c.pop).toBe("function");
			});

			it("should remove the last element", () => {
				draft.c.pop();
				expect(current(draft.c)).toStrictEqual([{ x: 1, y: [3] }]);
			});

			it("should return undefined from empty array", () => {
				draft.c = [];
				expect(draft.c.pop()).toBeUndefined();
			});

			it("should return the removed element from non-empty array", () => {
				expect(draft.c.pop()).toStrictEqual({ x: 2, y: [4] });
			});
		});

		describe("shift", () => {
			it("should be a function", () => {
				expect(typeof draft.c.shift).toBe("function");
			});

			it("should remove the first element", () => {
				draft.c.shift();
				expect(current(draft.c)).toStrictEqual([{ x: 2, y: [4] }]);
			});

			it("should return the removed element", () => {
				expect(draft.c.shift()).toStrictEqual({ x: 1, y: [3] });
			});
		});

		describe("unshift", () => {
			it("should be a function", () => {
				expect(typeof draft.c.unshift).toBe("function");
			});

			it("should add to the beginning", () => {
				draft.c.unshift({ x: -1, y: [] }, { x: -2, y: [0, 1] });
				expect(current(draft.c)).toStrictEqual([
					{ x: -1, y: [] },
					{ x: -2, y: [0, 1] },
					{ x: 1, y: [3] },
					{ x: 2, y: [4] },
				]);
			});

			it("should return the new length", () => {
				expect(
					draft.c.unshift(
						{ x: -1, y: [] },
						{ x: -2, y: [0, 1] },
						{ x: 0, y: [5] },
					),
				).toBe(5);
			});
		});

		describe("splice", () => {
			it("should be a function", () => {
				expect(typeof draft.c.splice).toBe("function");
			});

			it("should insert elements only with deleteCount === 0", () => {
				draft.c.splice(1, 0, { x: 10, y: [20] }, { x: 30, y: [40] });
				expect(current(draft.c)).toStrictEqual([
					{ x: 1, y: [3] },
					{ x: 10, y: [20] },
					{ x: 30, y: [40] },
					{ x: 2, y: [4] },
				]);
			});

			it("should remove then add elements", () => {
				draft.c = [
					{ x: 1, y: [3] },
					{ x: 2, y: [4] },
					{ x: 5, y: [6, 7] },
				];
				draft.c.splice(1, 1, { x: 10, y: [20] }, { x: 30, y: [40] });
				expect(current(draft.c)).toStrictEqual([
					{ x: 1, y: [3] },
					{ x: 10, y: [20] },
					{ x: 30, y: [40] },
					{ x: 5, y: [6, 7] },
				]);
			});

			it("should return the deleted elements", () => {
				draft.c = [
					{ x: 1, y: [3] },
					{ x: 2, y: [4] },
					{ x: 5, y: [6, 7] },
				];
				expect(
					draft.c.splice(1, 2, { x: 10, y: [20] }, { x: 30, y: [40] }),
				).toStrictEqual([
					{ x: 2, y: [4] },
					{ x: 5, y: [6, 7] },
				]);
			});
		});

		it("should not expose Map operations", () => {
			// @ts-expect-error Shouldn't exist
			expect(draft.c.has).toBeUndefined();
			// @ts-expect-error Shouldn't exist
			expect(draft.c.get).toBeUndefined();
			// @ts-expect-error Shouldn't exist
			expect(draft.c.set).toBeUndefined();
		});

		describe("find", () => {
			it("should return undefined if not found", () => {
				const draft1 = createDraft([{ a: 1 }, { a: 2 }]);
				expect(draft1.find((x) => x.a === 0)).toBeUndefined();
			});

			it("should return references with find", () => {
				const draft1 = createDraft([{ a: 1 }, { a: 2 }]);
				const res = draft1.find((x) => x.a === 2);
				expect(currentPath(res)).toStrictEqual([1]);
				expect(res).toBeDefined();
				res!.a = 3;
				expect(current(draft1)).toEqual([{ a: 1 }, { a: 3 }]);
			});

			it("should not be interfered by aliasing", () => {
				const aliased = { a: 1 };
				const draft1 = createDraft([aliased, aliased]);
				const res = draft1.find((x) => x.a === 1);
				expect(currentPath(res)).toStrictEqual([0]);
				expect(res).toBeDefined();
				res!.a = 3;
				expect(current(draft1)).toEqual([{ a: 3 }, { a: 1 }]);
			});
		});
	});

	describe("Map operations", () => {
		const getValueWithMap = () => ({
			map: new Map([
				["a", { x: 1 }],
				["b", { x: 2 }],
			]),
		});
		type ValueWithMap = ReturnType<typeof getValueWithMap>;
		let draftWithMap: ValueWithMap;

		beforeEach(() => {
			draftWithMap = createDraft(getValueWithMap());
		});

		describe("accessing the Map", () => {
			it("should have instanceof Map", () => {
				expect(draftWithMap.map).toBeInstanceOf(Map);
			});

			it("should have typeof being 'object'", () => {
				expect(typeof draftWithMap.map).toBe("object");
			});
		});

		describe("has", () => {
			it("should be a function", () => {
				expect(typeof draftWithMap.map.has).toBe("function");
			});

			it("should handle non-existent key", () => {
				expect(draftWithMap.map.has("test")).toBe(false);
			});

			it("should handle existing key", () => {
				expect(draftWithMap.map.has("a")).toBe(true);
			});
		});

		describe("get", () => {
			it("should be a function", () => {
				expect(typeof draftWithMap.map.get).toBe("function");
			});

			it("should return undefined for non-existent key", () => {
				expect(draftWithMap.map.get("test")).toBeUndefined();
			});

			it("should return the value for an existing key", () => {
				// strictEqual doesn't work due to proxying
				expect(draftWithMap.map.get("a")).toEqual({ x: 1 });
			});

			it("should return the ref to the correct path, by currentPath, for an existing key", () => {
				expect(currentPath(draftWithMap.map.get("a"))).toEqual(["map", "a"]);
			});
		});
	});
});
