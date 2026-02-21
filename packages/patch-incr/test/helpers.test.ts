import fc from "fast-check";
import { applyPatches, liftPatches, type Patches, type Path } from "../patch";
import { applyGet, applyGetOpt } from "../patch/access";
import {
	analyzeDisplacement,
	PatchBuilder,
	projectPatches,
} from "../patch/helpers";
import { IndexEnd } from "../patchSchema/types";
import * as gp from "./helpers/genPatched.test";

// numRuns being too large causes test timeout of 5000ms
const NUM_RUNS = 50;

/**
 * Given `projected = projectPatches(prefix, patches)` and `projected !== null`:
 *
 * `value[[prefix]] @ projected = (value @ patches)[[prefix]]`
 */
const projProjectPatches = <T>(gen: gp.GenWithPatches<T>, prefix: Path) => {
	it("project property", () => {
		fc.assert(
			fc.property(
				gen
					.arb()
					.map((x) => ({
						...x,
						projected: projectPatches(prefix, x.patches),
					}))
					.filter(
						({ value, projected }) =>
							projected !== null && applyGetOpt(value, prefix) !== undefined,
					),
				({ value, patches, projected }) => {
					fc.pre(projected !== null); // asserted for the type checker
					expect(
						applyPatches(applyGet(value, prefix), projected),
					).toStrictEqual(applyGet(applyPatches(value, patches), prefix));
				},
			),
			{ numRuns: NUM_RUNS },
		);
	});
};

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
	describe("single", () => {
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
						{ numRuns: NUM_RUNS },
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
						{ numRuns: NUM_RUNS },
					);
				});
			});
		});
	});

	describe("2D array", () => {
		const genArray2D = gp.array(
			gp.array(gp.integer({ min: 0, max: 5 }), { maxLength: 4 }),
			{
				maxLength: 4,
			},
		);
		describe.each<[Path]>([
			[[0]],
			[[1]],
			[[2]],
			[[0, 0]],
			[[0, 1]],
			[[0, 2]],
			[[1, 0]],
			[[1, 1]],
			[[1, 2]],
			[[2, 0]],
			[[2, 1]],
			[[2, 2]],
		])("project property: %o", (prefix: Path) =>
			projProjectPatches(genArray2D, prefix));
	});

	describe("multi", () => {
		const genNested = gp.record({
			int: gp.integer(),
			str: gp.string(),
			obj: gp.record({
				a: gp.string(),
				b: gp.record({ str: gp.string() }),
			}),
			tup: gp.tuple(gp.record({ a: gp.string() }), gp.boolean()),
		});

		describe("nested object and tuples only", () => {
			describe.each([
				[["int"]],
				[["str"]],
				[["obj"]],
				[["obj", "b"]],
				[["obj", "b", "str"]],
				[["tup"]],
				[["tup", 0]],
				[["tup", 1]],
			] as [Path][])("project property: %o", (prefix: Path) =>
				projProjectPatches(genNested, prefix));
		});

		const genNestedArray = gp.record({
			arr1: gp.array(
				gp.record({
					str1: gp.string(),
					arr2: gp.array(gp.record({ str: gp.string() }), { maxLength: 3 }),
				}),
				{ maxLength: 4 },
			),
		});

		describe("nested object with 1 layer of array", () => {
			describe.each([
				[["arr1"]],
				[["arr1", 0, "str1"]],
				[["arr1", 1, "str1"]],
			] as [Path][])("project property: %o", (prefix: Path) =>
				projProjectPatches(genNestedArray, prefix));
		});

		describe("nested object with 2 layers of array", () => {
			describe.each([
				[["arr1", 0, "arr2"]],
				[["arr1", 0, "arr2", 0, "str"]],
				[["arr1", 1, "arr2", 0, "str"]],
				[["arr1", 0, "arr2", 1, "str"]],
				[["arr1", 1, "arr2", 1, "str"]],
			] as [Path][])("project property: %o", (prefix: Path) =>
				projProjectPatches(genNestedArray, prefix));
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
});
