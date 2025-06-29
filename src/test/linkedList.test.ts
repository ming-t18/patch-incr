import fc from "fast-check";
import { create } from "../incr/collections/linkedList/linkedList";
import { applyPatches } from "../incr/patch";
import * as gp from "./helpers/genPatched.test";

describe("LinkedList", () => {
	describe("is like array", () => {
		const arbArr = fc.array(fc.integer(), { maxLength: 100 });
		it("should have the same length", () => {
			fc.assert(fc.property(arbArr, (xs) => create(xs).length === xs.length));
		});

		it("should recover array from @@iterator", () => {
			fc.assert(
				fc.property(arbArr, (xs) => {
					expect([...create(xs)]).toStrictEqual(xs);
				}),
			);
		});

		it("should have same value by indexing", () => {
			fc.assert(
				fc.property(arbArr, (xs) => {
					const ll = create(xs);
					for (let i = 0; i < xs.length; i++) {
						expect(ll.getIndex(i)).toStrictEqual(xs[i]);
					}
				}),
			);
		});

		it("should have consistent setter by setIndex", () => {
			fc.assert(
				fc.property(
					arbArr,
					fc.integer({ min: 1, max: 100 }),
					fc.integer(),
					(xs, i, v) => {
						fc.pre(i < xs.length);
						const updated = [...xs];
						updated[i] = v;
						const ll = create(xs);
						ll.setIndex(i, v);
						expect([...ll]).toStrictEqual(updated);
					},
				),
			);
		});

		it("should have consistent setter by index assignment", () => {
			fc.assert(
				fc.property(
					arbArr,
					fc.integer({ min: 1, max: 100 }),
					fc.integer(),
					(xs, i, v) => {
						fc.pre(i < xs.length);
						const updated = [...xs];
						updated[i] = v;
						const ll = create(xs);
						ll[i] = v;
						expect([...ll]).toStrictEqual(updated);
					},
				),
			);
		});

		it("should have consistent splice", () => {
			fc.assert(
				fc.property(
					arbArr,
					fc.integer({ min: 1, max: 100 }),
					fc.integer({ min: 1, max: 100 }),
					arbArr,
					(xs, start, del, add) => {
						// fc.pre(start < xs.length && start + del < xs.length);
						const updated = [...xs];
						updated.splice(start, del, ...add);
						const ll = create(xs);
						ll.splice(start, del, ...add);
						expect([...ll]).toStrictEqual(updated);
					},
				),
			);
		});

		// TODO implement this
		it.skip("should be able to apply JSON patches", () => {
			fc.assert(
				fc.property(gp.array(gp.integer()).arb(), ({ value, patches }) => {
					const list = create(value);
					const list1 = applyPatches(list, patches as never);
					const arr1 = applyPatches(value, patches);
					expect([...list1]).toStrictEqual(arr1);
				}),
			);
		});
	});
});
