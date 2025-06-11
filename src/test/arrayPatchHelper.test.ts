import fc from "fast-check";
import { splice, swap } from "../incr/list/arrayPatchHelpers";
import { applyPatches } from "../incr/patch";

describe("arrayPathHelper", () => {
	const arbArr = fc.array(fc.integer({ min: -100, max: 100 }));

	it("swap", () => {
		fc.assert(
			fc.property(
				arbArr
					.filter((a) => a.length > 0)
					.chain((array) => {
						const arbIndex = fc.integer({ min: 0, max: array.length - 1 });
						return fc.record({
							array: fc.constant(array),
							i: arbIndex,
							j: arbIndex,
						});
					}),
				({ array, i, j }) => {
					const actual = [...array];
					[actual[i], actual[j]] = [actual[j], actual[i]];
					expect(applyPatches(array, swap(array, i, j))).toStrictEqual(actual);
				},
			),
		);
	});

	it("splice", () => {
		fc.assert(
			fc.property(
				arbArr
					.filter((a) => a.length > 0)
					.chain((array) => {
						const arbIndex = fc.integer({ min: 0, max: array.length - 1 });
						return fc.record({
							array: fc.constant(array),
							index: arbIndex,
						});
					})
					.chain(({ array, index }) => {
						return fc.record({
							array: fc.constant(array),
							index: fc.constant(index),
							toRemove: fc.integer({ min: 0, max: array.length - index }),
							toAdd: arbArr,
						});
					}),
				({ array, index, toRemove, toAdd }) => {
					const actual = [...array];
					actual.splice(index, toRemove, ...toAdd);
					expect(
						applyPatches(array, splice(index, toRemove, toAdd)),
					).toStrictEqual(actual);
				},
			),
		);
	});
});
