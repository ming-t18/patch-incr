/** biome-ignore-all lint/style/noNonNullAssertion: for some assertions */
import fc from "fast-check";
import I from "immutable";
import { type Measure, Measures, measureList } from "@/measure";
import type { HasListNode, ListNode } from "@/types";
import { isListNode, VNode } from "@/types";

// fc.configureGlobal({ numRuns: 5000, verbose: true });

const totalLength = <T>(node?: ListNode<T> | null): number => {
	if (!node) {
		return 0;
	}
	return node.array.reduce(
		(n: number, node) =>
			isListNode(node) ? n + totalLength(node) : node === undefined ? n : n + 1,
		0,
	);
};

function* traverseNodes<T>(node?: ListNode<T> | null): Generator<T> {
	if (!node) {
		return;
	}

	for (const child of node.array) {
		if (child === undefined) {
			continue;
		}
		if (isListNode(child)) {
			yield* traverseNodes(child);
		} else yield child;
	}
}

const propTotalLength = <T>(list: I.List<T>) =>
	totalLength((list as HasListNode<T>)._root) +
		totalLength((list as HasListNode<T>)._tail) ===
	list.size;
const propTraversal = <T>(list: I.List<T>) => {
	expect([
		...traverseNodes((list as HasListNode<T>)._root),
		...traverseNodes((list as HasListNode<T>)._tail),
	]).toStrictEqual([...list]);
};

const propHomogeneousArray = <T>(list: I.List<T>) => {
	function recurse(node?: ListNode<T> | null) {
		if (!node) {
			return;
		}
		if (node.array.length === 0) {
			return;
		}
		// try {
		if (node.array[0] instanceof VNode) {
			expect(node.array.every((n) => n instanceof VNode)).toBe(true);
		} else {
			expect(
				node.array.every((n) => n !== undefined || !(n instanceof VNode)),
			).toBe(true);
		}
		// } catch (e) {
		// 	console.error("propHomogeneousArray failed", node);
		// 	throw e;
		// }
		for (const elem of node.array) {
			if (elem instanceof VNode) {
				recurse(elem as never);
			}
		}
	}
	recurse((list as HasListNode<T>)._root);
	recurse((list as HasListNode<T>)._tail);
};

const NODE_SIZE = 32;

const arbListOp = <T>(
	arbValue: fc.Arbitrary<T>,
	maxLength: number,
): fc.Arbitrary<(input: I.List<T>) => I.List<T> | null> =>
	fc.oneof(
		fc
			.integer({ min: 0, max: maxLength })
			.map(
				(index) => (list: I.List<T>) =>
					index < 0 || index >= list.size ? null : list.remove(index),
			),
		fc.tuple(fc.integer({ min: 0, max: maxLength }), arbValue).map(
			([index, value]) =>
				(list: I.List<T>) =>
					index < 0 || index >= list.size + 1
						? null
						: list.insert(index, value),
		),
		fc.tuple(fc.integer({ min: 0, max: maxLength }), arbValue).map(
			([index, value]) =>
				(list: I.List<T>) =>
					index < 0 || index >= list.size ? null : list.set(index, value),
		),
	);

const arbList = <T>(
	arb: fc.Arbitrary<T>,
	{
		minLength = 0,
		maxLength = NODE_SIZE * NODE_SIZE * (NODE_SIZE + 1),
	}: { minLength?: number; maxLength?: number },
): fc.Arbitrary<I.List<T>> =>
	fc
		.tuple(
			fc.array(arb, { minLength, maxLength }),
			fc.array(arbListOp<T>(arb, maxLength), { maxLength: 8 }),
		)
		.map(([arr0, ops]) => {
			let list = I.List(arr0);
			for (const op of ops) {
				const list1 = op(list);
				if (list1 === null) {
					break;
				}
				list = list1;
			}
			return list;
		})
		.filter((x) => x !== null);

describe.skip("internal representation of List", () => {
	describe("length below NODE_SIZE", () => {
		it("empty list should have _root and _tail", () => {
			const empty = {
				_root: undefined,
				_tail: undefined,
			};
			fc.assert(
				fc.property(
					arbList(fc.boolean(), { maxLength: 2 }).filter((x) => x.size === 1),
					(list) => {
						expect(list as never as HasListNode<boolean>).toMatchObject(empty);
					},
				),
			);
		});

		it("singleton list should have null root and non-null tail", () => {
			fc.assert(
				fc.property(
					arbList(fc.integer(), { maxLength: 1 }).filter((x) => x.size === 1),
					(list) => {
						expect(list as never as HasListNode<null>).toMatchObject({
							_root: null,
							_tail: { array: [list.get(0)] },
						});
					},
				),
			);
		});

		it("lists below length of NODE_SIZE should have null/undefined root", () => {
			fc.assert(
				fc.property(arbList(fc.integer(), { maxLength: NODE_SIZE }), (list) => {
					expect(list).toMatchObject({
						_root: list.size === 0 ? undefined : null,
					});
				}),
			);
		});
	});

	describe("length above NODE_SIZE", () => {
		it("lists with length of NODE_SIZE + 1 should have defined _root and _tail", () => {
			const list: HasListNode<number> = I.List(
				Array(NODE_SIZE + 1).fill(0),
			) as never;
			expect((list._root!.array[0] as ListNode<number>).array).toHaveLength(
				NODE_SIZE,
			);
			expect(list._tail!.array).toHaveLength(1);
			expect(list._root).toBeInstanceOf(VNode);
			expect(list._tail).toBeInstanceOf(VNode);
		});

		it("lists > length of NODE_SIZE should have defined _root and _tail", () => {
			fc.assert(
				fc.property(
					fc
						.array(fc.integer({ min: -10, max: 10 }), {
							minLength: NODE_SIZE,
							maxLength: NODE_SIZE * NODE_SIZE,
						})
						.map(I.List),
					(list) => {
						expect((list as HasListNode<number>)._root).toBeTruthy();
						expect((list as HasListNode<number>)._tail).toBeTruthy();
					},
				),
			);
		});
	});

	describe("traversal properties", () => {
		const arbListInt = arbList(fc.integer({ min: -10, max: 10 }), {
			maxLength: NODE_SIZE * NODE_SIZE * NODE_SIZE + 10,
		});

		it("total length property", () => {
			fc.assert(fc.property(arbListInt, propTotalLength));
		});

		it("traversal property", () => {
			fc.assert(fc.property(arbListInt, propTraversal));
		});

		it("homogeneous node array property", () => {
			fc.assert(fc.property(arbListInt, propHomogeneousArray));
		});
	});
});

describe("measureList", () => {
	describe("measure on the entire list should evaluate correctly", () => {
		const propMeasureList = <T, M>(m: Measure<T, M>) => {
			const ml = measureList(m);
			return (list: I.List<T>) =>
				ml(list) ===
				list.reduce((a: M, b: T) => m.combine(a, m.measure(b)), m.zero);
		};

		it("total length", () => {
			fc.assert(
				fc.property(
					fc.array(fc.integer({ min: -100, max: 100 })).map(I.List),
					propMeasureList(Measures.length()),
				),
			);
		});

		it("sum", () => {
			fc.assert(
				fc.property(
					fc.array(fc.integer({ min: -100, max: 100 })).map(I.List),
					propMeasureList(Measures.sum()),
				),
			);
		});

		it("sumBigint", () => {
			fc.assert(
				fc.property(
					fc.array(fc.bigInt({ min: -100n, max: 100n })).map(I.List),
					propMeasureList(Measures.sumBigint()),
				),
			);
		});
	});

	describe.skip("number of re-evaluations for long lists", () => {
		let items = I.List<number>([]);
		const evals = { value: 0 };
		const length1 = {
			...Measures.addNumber,
			measure: (value: number) => {
				if (typeof value !== "number") {
					console.error({ value });
					throw new Error("measure: not a number element");
				}
				evals.value++;
				return 1;
			},
		};
		const ml = measureList(length1);
		beforeEach(() => {
			items = I.List(Array(NODE_SIZE * NODE_SIZE * NODE_SIZE).fill(0));
			evals.value = 0;
			expect(ml(items)).toBe(items.size);
			expect(evals.value).toBe(items.size);

			evals.value = 0;
		});

		const arbItems = arbList(fc.constantFrom(0 as number), {
			minLength: NODE_SIZE * NODE_SIZE * 8,
			maxLength: NODE_SIZE * NODE_SIZE * NODE_SIZE,
		}); //.filter((x) => x.size > NODE_SIZE);
		it("should re-evaluate (NODE_SIZE) times for a shift", () => {
			fc.assert(
				fc.property(arbItems, (items) => {
					evals.value = 0;
					fc.pre(items.size > NODE_SIZE);
					const items1 = items.splice(0, 1);
					expect(ml(items1)).toBe(items1.size);
					expect(evals.value).toBe(NODE_SIZE - 1);
				}),
				{ numRuns: 100 },
			);
		});

		it("should re-evaluate (NODE_SIZE - 1) times for a pop", () => {
			fc.assert(
				fc.property(arbItems, (items) => {
					evals.value = 0;
					const items1 = items.remove(items.size - 1);
					expect(ml(items1)).toBe(items1.size);
					expect(evals.value).toBe(NODE_SIZE - 1);
				}),
			);
		});

		it("should re-evaluate once for a push", () => {
			fc.assert(
				fc.property(arbItems, (items) => {
					evals.value = 0;
					const items1 = items.insert(items.size, 100);
					try {
						expect(ml(items1)).toBe(items1.size);
						expect(evals.value).toBe(1);
					} catch (e) {
						console.log([...items], items.size, evals.value);
						throw e;
					}
				}),
			);
		});

		it("should re-evaluate NODE_SIZE times after a replace from middle", () => {
			const idx = Math.floor(items.size * 0.8);
			const items1 = items.set(idx, 100);
			expect(ml(items1)).toBe(items1.size);
			expect(evals.value).toBe(NODE_SIZE);
		});

		it("should re-evaluate a fraction of measures with remove at a point", () => {
			fc.assert(
				fc.property(
					fc.double({
						min: 0.01,
						max: 0.99,
						noNaN: true,
						noDefaultInfinity: true,
					}),
					(frac) => {
						evals.value = 0;
						const idx = Math.floor(items.size * frac);
						const items1 = items.remove(idx);
						expect(ml(items1)).toBe(items1.size);
						const fracChanged = Math.abs(evals.value) / items.size;
						// 5% margin
						expect(fracChanged).toBeLessThanOrEqual(1.05 - frac);
					},
				),
			);
		});
	});
});
