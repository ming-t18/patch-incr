import fc from "fast-check";
import { applyPatches, liftPatches, type Patches } from "../patch";
import {
	analyzeDisplacement,
	PatchBuilder,
	projectPatches,
} from "../patch/helpers";
import * as ps from "../patchSchema";
import { IndexEnd } from "../patchSchema/types";
import * as gp from "./helpers/genPatched.test";

const _patchSchema = ps.record({
	arr: ps.array(ps.record({ value: ps.atomic<number>() })),
	str: ps.atomic<string>(),
	obj: ps.record({ bool: ps.atomic<boolean>() }),
});
const gpStr = gp.string();
const gpArr = gp.array(gp.record({ value: gp.integer() }));
const gpObj = gp.record({ bool: gp.boolean() });
const gpRoot = gp.record({ arr: gpArr, str: gpStr, obj: gpObj });

describe("liftPatches", () => {
	it("should lift atomic value", () => {
		fc.assert(
			fc.property(gpStr.arb(), ({ value: str, patches: dStr }) => {
				expect(applyPatches(str, dStr)).toEqual(
					applyPatches({ str }, liftPatches("str", dStr)).str,
				);
			}),
		);
	});

	it("should lift object", () => {
		fc.assert(
			fc.property(gpObj.arb(), ({ value: obj, patches: dObj }) => {
				expect(applyPatches(obj, dObj)).toEqual(
					applyPatches({ obj }, liftPatches("obj", dObj)).obj,
				);
			}),
		);
	});

	it("should lift array", () => {
		fc.assert(
			fc.property(gpArr.arb(), ({ value: arr, patches: dArr }) => {
				expect(applyPatches(arr, dArr)).toEqual(
					applyPatches({ arr }, liftPatches("arr", dArr)).arr,
				);
			}),
		);
	});
});

describe("projectPatches", () => {
	const arbKey = fc.constantFrom("arr", "str", "obj");
	it("should return null if and only if the patch acts on root", () => {
		fc.assert(
			fc.property(arbKey, gpRoot.arb(), (key, { patches: dx }) => {
				expect(projectPatches(key, dx) === null).toBe(
					dx.findIndex((e) => e.path.length === 0) !== -1,
				);
			}),
		);
	});

	it("should not increase patch length", () => {
		fc.assert(
			fc.property(arbKey, gpRoot.arb(), (key, { patches: dx }) => {
				const res = projectPatches(key, dx);
				fc.pre(res !== null);
				return res.length <= dx.length;
			}),
		);
	});

	it("should act on the target value", () => {
		fc.assert(
			fc.property(arbKey, gpRoot.arb(), (key, { value: x, patches: dx }) => {
				const res = projectPatches(key, dx);
				fc.pre(res !== null);
				// @ts-expect-error "any" type for [key]
				const expected = applyPatches(x, dx)[key];
				// @ts-expect-error "any" type for x[key]
				const actual = applyPatches(x[key], res);
				expect(expected).toEqual(actual);
			}),
		);
	});

	const propProjectPatches = <T>(
		key: (string | number) & keyof T,
		{ value, patches }: { value: T; patches: Patches<T> },
	) => {
		const value1 = value[key] as unknown;
		const patches1 = projectPatches(key, patches) as Patches | null;
		fc.pre(patches1 !== null);

		const actual = applyPatches(value, patches)[key];
		expect(actual).toStrictEqual(applyPatches(value1, patches1));
	};

	const genRecord = gp.record({
		a: gp.string(),
		b: gp.array(gp.string()),
		c: gp.record({
			value: gp.boolean(),
		}),
	});
	describe("properties", () => {
		describe("record key", () => {
			it("applying projected patch", () => {
				fc.assert(
					fc.property(
						fc.constantFrom<keyof gp.InferArbValue<typeof genRecord>>(
							"a",
							"b",
							"c",
						),
						genRecord.arb(),
						propProjectPatches,
					),
				);
			});
		});

		const genArray = gp.array(genRecord, { maxLength: 10 });
		describe("array index and displacement", () => {
			it("applying projected patch", () => {
				fc.assert(
					fc.property(
						fc.integer({ min: 0, max: 10 }),
						genArray.arb(),
						(index, { value, patches }) => {
							fc.pre(index < value.length);
							propProjectPatches(index, { value, patches });
						},
					),
				);
			});
		});
	});
});

describe("analyzeDisplacement", () => {
	describe("on root", () => {
		it("should return null on empty patches", () => {
			expect(analyzeDisplacement([])).toBeNull();
		});

		it("should return null on insertion at the end", () => {
			expect(
				analyzeDisplacement(
					PatchBuilder.empty<unknown[]>().add([IndexEnd], "test").build(),
				),
			).toBeNull();
		});

		it("should return the index of insertion on a single add patch", () => {
			expect(
				analyzeDisplacement(
					PatchBuilder.empty<unknown[]>().add([3], "test").build(),
				),
			).toBe(3);
		});

		it("should return the index of deletion on a single remove patch", () => {
			expect(
				analyzeDisplacement(
					PatchBuilder.empty<unknown[]>().remove([3]).build(),
				),
			).toBe(3);
		});

		it("should return the min index on multiple patches", () => {
			expect(
				analyzeDisplacement(
					PatchBuilder.empty<unknown[]>().remove([3]).add([4], "abc").build(),
				),
			).toBe(3);
			expect(
				analyzeDisplacement(
					PatchBuilder.empty<unknown[]>().add([3], "abc").remove([4]).build(),
				),
			).toBe(3);
		});
	});

	describe("on path", () => {
		const genArray = gp.array(gp.record({ a: gp.integer() }));
		const prefix = ["a", "b", "c"];
		const prefixOther = ["a", "x", "c"];

		it("should preserve result on adding a prefix with liftPatches", () => {
			fc.assert(
				fc.property(genArray.arb(), ({ patches }) => {
					expect(analyzeDisplacement(patches)).toBe(
						analyzeDisplacement(liftPatches(prefix, patches), prefix),
					);
				}),
			);
		});

		it("should ignore non-matching prefixes", () => {
			fc.assert(
				fc.property(
					fc
						.tuple(genArray.arb(), genArray.arb(), fc.boolean())
						.map(([{ patches: patchesOrig }, { patches: pOther }, order]) => ({
							patchesCombined: order
								? [
										...liftPatches(prefix, patchesOrig),
										...liftPatches(prefixOther, pOther),
									]
								: [
										...liftPatches(prefixOther, pOther),
										...liftPatches(prefix, patchesOrig),
									],
							patchesOrig,
						})),
					({ patchesOrig, patchesCombined }) => {
						expect(analyzeDisplacement(patchesOrig)).toBe(
							analyzeDisplacement(patchesCombined, prefix),
						);
					},
				),
			);
		});
	});
});
