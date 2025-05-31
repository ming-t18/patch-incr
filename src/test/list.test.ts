import fc from "fast-check";
import { access, atomicFunc, identity, record } from "../incr/builder";
import { IFGraphBuilder } from "../incr/graphBuilder";
import { concat, filter, flatMap, map, scan } from "../incr/list";
import { PatchOp, type Patches, applyPatches, liftPatch } from "../incr/patch";
import type { IF, InferIFOutput } from "../incr/types";
import * as gp from "./helpers/genPatched.test";
import {
	ensurePatchCoherent,
	ensurePatchLiftingProperty,
	ensurePatchSplitProperty,
} from "./helpers/props.test";

fc.configureGlobal({ numRuns: 1000 });

describe("genPatches helpers", () => {
	const prop_noArrayHoles = <T>({ value, patches }: gp.WithPatches<T[]>) => {
		const value1 = applyPatches(value, patches);
		if (!(value1.findIndex((x) => x === undefined) === -1)) {
			console.error({ value, patches, value1 });
			return false;
		}
		return true;
	};
	describe("array", () => {
		it("should patch properly", () => {
			fc.assert(
				fc.property(gp.array(gp.integer()).arb(), ({ value, patches }) => {
					applyPatches(value, patches);
					return true;
				}),
			);
		});

		it("should not produce array holes", () => {
			fc.assert(fc.property(gp.array(gp.integer()).arb(), prop_noArrayHoles));
		});

		it("should patch properly for 2D arrays of integers", () => {
			fc.assert(
				fc.property(
					gp.array(gp.array(gp.integer())).arb(),
					({ value, patches }) => {
						applyPatches(value, patches);
						return true;
					},
				),
			);
		});

		it("should not produce array holes, 2D arrays of integers", () => {
			fc.assert(
				fc.property(gp.array(gp.array(gp.integer())).arb(), prop_noArrayHoles),
			);
		});

		const arb2d = gp.array(
			gp.array(
				gp.record({
					a: gp.integer(),
					b: gp.integer(),
				}),
			),
		);
		it("should patch properly for 2D arrays of records integers", () => {
			fc.assert(
				fc.property(arb2d.arb(), ({ value, patches }) => {
					applyPatches(value, patches);
					return true;
				}),
			);
		});

		it("should not produce array holes, 2D array of record", () => {
			fc.assert(fc.property(arb2d.arb(), prop_noArrayHoles));
		});
	});

	describe("record", () => {
		it("should patch deep record properly", () => {
			fc.assert(
				fc.property(
					gp
						.record({
							a: gp.integer(),
							b: gp.array(gp.integer()),
							c: gp.array(gp.record({ d: gp.integer() })),
							d: gp.array(gp.tuple(gp.string(), gp.integer())),
						})
						.arb(),
					({ value, patches }) => {
						// console.log({ value, patches });
						applyPatches(value, patches);
						return true;
					},
				),
				{ verbose: true },
			);
		});
	});
});

describe("concat", () => {
	describe("array of numbers", () => {
		const arbElem0 = gp.integer({ min: -100, max: 100 });
		const arr = gp.array(gp.array<number>(arbElem0, { maxLength: 5 }), {
			maxLength: 5,
		});
		it("concat on arrays of numbers is patch coherent", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, c);
					},
				),
			);
		});

		it("concat on arrays of numbers is follows patch split property", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchSplitProperty(value, patches, c);
					},
				),
			);
		});

		it("add empty list (for debugging)", () => {
			const c = concat();
			const x: number[][] = [[], [], []];
			const dx: Patches<number[][]> = [
				{
					op: PatchOp.Replace,
					path: [1],
					value: [100],
				},
				{
					op: PatchOp.Replace,
					path: [1],
					value: [],
				},
			];
			const y = c.invoke(x);
			const dy = c.forward(x, dx, y);
			console.log({ x, y, dx, dy });
			const x1 = applyPatches(x, dx);
			const y1 = applyPatches(y, dy);
			console.log({ x1, y1 });
		});
	});

	describe("initially empty arrays of numbers", () => {
		const arbElem0 = gp.atomic(fc.integer({ min: -100, max: 100 }));
		const arr = gp.array(gp.array<number>(arbElem0, { maxLength: 0 }), {
			maxLength: 5,
		});
		it("concat on initially empty arrays of numbers is patch coherent", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, c);
					},
				),
			);
		});

		it("concat on initially empty arrays of numbers follows patch split property", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchSplitProperty(value, patches, c);
					},
				),
			);
		});
	});

	const arbElem = gp.record({
		str: gp.string(),
		num: gp.atomic(fc.integer({ min: -100, max: 100 })),
	});
	describe("concat on record", () => {
		const arr = gp.array(gp.array(arbElem, { maxLength: 3 }), { maxLength: 3 });

		it("concat on record is patch coherent", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, c);
					},
				),
			);
		});

		it("concat on record follows patch split property", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchSplitProperty(value, patches, c);
					},
				),
			);
		});
	});

	it("concat on array (3D -> 2D) is patch coherent, empties", () => {
		const c = concat();
		fc.assert(
			fc.property(
				gp
					.array(
						gp.array(gp.array(arbElem, { maxLength: 0 }), { maxLength: 2 }),
						{ maxLength: 5 },
					)
					.arb(undefined, { maxLength: 2 }),
				({ value, patches }) => {
					ensurePatchCoherent(value, patches, c);
				},
			),
		);
	});

	describe("concat on array (3D -> 2D)", () => {
		const arr = gp.array(
			gp.array(gp.array(arbElem, { maxLength: 0 }), { maxLength: 2 }),
			{ maxLength: 5 },
		);
		it("concat on array (3D -> 2D) is patch coherent", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 2 }),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, c);
					},
				),
			);
		});

		it("concat on array (3D -> 2D) follows patch split property", () => {
			const c = concat();
			fc.assert(
				fc.property(
					arr.arb(undefined, { maxLength: 2 }),
					({ value, patches }) => {
						ensurePatchSplitProperty(value, patches, c);
					},
				),
			);
		});
	});
});

describe("map", () => {
	const ensurePatchLiftingPropertyMap = <X, Y>(
		{ value, patches }: { value: X; patches: Patches<X> },
		func: IF<X, Y>,
	) =>
		ensurePatchLiftingProperty(
			value,
			patches,
			func,
			map(func),
			(x) => [x],
			(p) => liftPatch(0, p),
			(p) => liftPatch(0, p),
		);
	describe("map identity", () => {
		it("patch coherent for integers", () => {
			const mi = map(identity<number>());
			fc.assert(
				fc.property(gp.array(gp.integer()).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, mi);
				}),
			);
		});

		it("patch splitting property for lists of integers", () => {
			const mi = map(identity<number>());
			fc.assert(
				fc.property(
					gp.array(gp.integer(), { maxLength: 2 }).arb(),
					({ value, patches }) => {
						ensurePatchSplitProperty(value, patches, mi);
					},
				),
			);
		});

		const arbRecord = gp.record({
			a: gp.integer(),
			b: gp.array(gp.integer()),
		});
		it("patch coherent for lists of records", () => {
			fc.assert(
				fc.property(gp.array(arbRecord).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, map(identity()));
				}),
			);
		});

		it("patch splitting property for lists of records", () => {
			fc.assert(
				fc.property(gp.array(arbRecord).arb(), ({ value, patches }) => {
					ensurePatchSplitProperty(value, patches, map(identity()));
				}),
			);
		});

		it("patch lifting for lists of records", () => {
			fc.assert(
				fc.property(arbRecord.arb(), (vp) =>
					ensurePatchLiftingPropertyMap(vp, identity()),
				),
			);
		});
	});

	describe("map replace", () => {
		it("map map replace is patch coherent for integers", () => {
			fc.assert(
				fc.property(
					gp.array(gp.integer({ min: -100, max: 100 })).arb(),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, map(atomicFunc((x) => x + 1)));
					},
				),
			);
		});

		it("map replace patch lifting", () => {
			const af = atomicFunc((x: number) => x + 1);
			fc.assert(
				fc.property(gp.integer({ min: -100, max: 100 }).arb(), (vp) =>
					ensurePatchLiftingPropertyMap(vp, af),
				),
			);
		});
	});

	describe("map map replace", () => {
		const arbElem = gp.array(gp.integer());
		const mapping = map(atomicFunc((x: number) => x + 1));

		it("map map replace is patch coherent for integers", () => {
			fc.assert(
				fc.property(gp.array(arbElem).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, map(mapping));
				}),
			);
		});

		it("map map replace patch lifting", () => {
			fc.assert(
				fc.property(arbElem.arb(), (vp) =>
					ensurePatchLiftingPropertyMap(vp, mapping),
				),
			);
		});
	});

	it("map into 2D array", () => {
		const mapping = map(
			atomicFunc(({ a, b }: { a: number; b: number }) =>
				Array(a + b)
					.fill(null)
					.map((i) => i + 2),
			),
		);
		fc.assert(
			fc.property(
				gp
					.array(
						gp.record({
							a: gp.integer({ min: 0, max: 3 }),
							b: gp.integer({ min: 0, max: 3 }),
						}),
					)
					.arb(),
				(vp) => ensurePatchLiftingPropertyMap(vp, mapping),
			),
		);
	});

	describe.skip("map compose", () => {
		const mapping1 = record({
			a: atomicFunc((x: number) => x + 1),
			b: atomicFunc((x: number) => `${x % 5}`),
		});
		type Out = InferIFOutput<typeof mapping1>;
		const mapping2 = record({
			p: access<number, "a", Out>("a"),
			q: IFGraphBuilder.empty<Out>().add([] as const, access(0)),
		});
		// TODO
	});
});

describe("scan", () => {
	describe("scan number add", () => {
		const arbElem = gp.atomic(fc.integer({ min: -100, max: 100 }));
		const mapping = (x: number, y: number) => x + y;
		it("path coherent", () => {
			fc.assert(
				fc.property(gp.array(arbElem).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, scan(mapping, 0));
				}),
			);
		});
	});

	describe("scan record", () => {
		const arbElem = gp.record({
			add: gp.atomic(fc.integer({ min: -100, max: 100 })),
			mult: gp.atomic(fc.integer({ min: -5, max: 5 })),
			concat: gp.atomic(
				fc.option<string, undefined>(fc.string({ unit: "grapheme-ascii" })),
			),
			combined: gp.atomic(fc.bigInt()),
		});
		type Obj = gp.InferArbValue<typeof arbElem>;
		const mapping = (x: Obj, y: Obj): Obj => {
			const combined =
				(BigInt(x.add) +
					BigInt(y.mult) +
					BigInt(x.concat?.length ?? 0) +
					x.combined +
					y.combined) %
				12345n;
			try {
				return {
					add: x.add + y.add,
					mult: x.mult * y.mult,
					concat: (x.concat ?? "") + (y.concat ?? ""),
					combined,
				};
			} catch (e) {
				console.error({ x, y, combined });
				throw e;
			}
		};

		it.skip("sample arbElem", () => {
			for (const x of fc.sample(arbElem.arb(), 100)) {
				console.log(x);
			}
		});

		it("path coherent", () => {
			fc.assert(
				fc.property(gp.array(arbElem).arb(), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						scan(mapping, {
							add: 0,
							mult: 0,
							concat: "",
							combined: 0n,
						} as Obj),
					);
				}),
			);
		});

		const arbMultiRemove = gp
			.array(arbElem)
			.arb()
			.filter(({ value }) => value.length > 0)
			.chain(({ value, patches }) =>
				fc.record({
					value: fc.constant(value),
					patches: fc
						.array(fc.integer({ min: 0, max: value.length - 1 }))
						.map((xs) => [...new Set(xs)])
						.map((xs) =>
							xs.map((index) => ({
								op: PatchOp.Remove,
								path: [index],
							})),
						) as fc.Arbitrary<never> as fc.Arbitrary<typeof patches>,
				}),
			);

		it.skip("sample", () => {
			for (const x of fc.sample(arbMultiRemove, 1000)) {
				console.log(x);
			}
		});

		it("path coherent for multiple removes", () => {
			fc.assert(
				fc.property(arbMultiRemove, ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						scan(mapping, {
							add: 0,
							mult: 0,
							concat: "",
							combined: 0n,
						} as Obj),
					);
				}),
			);
		});
	});
});

const arbElem0 = gp.integer({ min: -100, max: 100 });
const arbElem = gp.record({
	str: gp.string(),
	num: gp.integer({ min: 0, max: 100 }),
});

describe("filter", () => {
	it.skip("apply patch test", () => {
		console.log(
			applyPatches([] as string[], [
				{
					op: PatchOp.Add,
					path: [5],
					value: "test",
				},
			]),
		);

		console.log(
			applyPatches([] as string[], [
				{
					op: PatchOp.Replace,
					path: [5],
					value: "test",
				},
			]),
		);

		console.log(
			applyPatches([] as string[], [
				{
					op: PatchOp.Remove,
					path: [5],
				},
			]),
		);
	});

	describe("filter false", () => {
		it("filter false is patch coherent", () => {
			const filterFalse = filter(() => false);
			fc.assert(
				fc.property(gp.array<number>(arbElem0).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, filterFalse);
				}),
			);
		});
	});

	describe("filter true", () => {
		it("filter true is patch coherent", () => {
			const filterTrue = filter(() => true);
			fc.assert(
				fc.property(gp.array<number>(arbElem0).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, filterTrue);
				}),
			);
		});
	});

	describe("filter is even", () => {
		it("filter is even is patch coherent", () => {
			fc.assert(
				fc.property(gp.array<number>(arbElem0).arb(), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						filter((x) => x % 2 === 0),
					);
				}),
			);
		});
	});

	describe("filter on record", () => {
		it("filter on record is patch coherent", () => {
			const filterOnRecord = filter<{ str: string; num: number }>(
				({ str, num }) => (str.length + num) % 2 === 0,
			);
			fc.assert(
				fc.property(gp.array(arbElem).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, filterOnRecord);
				}),
			);
		});
	});
});

describe("flatMap", () => {
	const arbElem0 = gp.atomic(fc.integer({ min: 0, max: 100 }));

	describe("flatMap on atomic values", () => {
		it("flatMap on atomic values is patch coherent", () => {
			const fm = flatMap(
				atomicFunc((x: number) =>
					Array(x)
						.fill(null)
						.map((i) => i + 2),
				),
			);
			fc.assert(
				fc.property(gp.array(arbElem0).arb(), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, fm);
				}),
			);
		});
	});

	describe("flatMap on trivial values", () => {
		const arbElem1 = gp.record({ a: gp.integer({ min: 0, max: 5 }) });
		it("flatMap on singleton record values is patch coherent", () => {
			const fm = flatMap(
				atomicFunc(({ a }: gp.InferArbValue<typeof arbElem1>) =>
					Array(a)
						.fill(null)
						.map((_, i) => 1000 + i),
				),
			);
			fc.assert(
				fc.property(
					gp.array(arbElem1, { maxLength: 5 }).arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, fm);
					},
				),
			);
		});
	});

	describe("flatMap on record values", () => {
		const arbElem1 = gp.record({
			a: gp.integer({ min: 0, max: 5 }),
			b: gp.integer({ min: 0, max: 5 }),
		});
		it("flatMap on record values is patch coherent", () => {
			const fm = flatMap(
				atomicFunc(({ a, b }: gp.InferArbValue<typeof arbElem1>) =>
					Array(a + b)
						.fill(null)
						.map((_, i) => 1000 + i),
				),
			);
			fc.assert(
				fc.property(
					gp.array(arbElem1, { maxLength: 5 }).arb(undefined, { maxLength: 5 }),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, fm);
					},
				),
			);
		});
	});

	it("filter can be expressed in terms of flatMap", () => {
		const pred = ({ str, num }: gp.InferArbValue<typeof arbElem>) =>
			str.length + (num % 2) === 0;
		const fm = flatMap(
			atomicFunc((x: gp.InferArbValue<typeof arbElem>) => (pred(x) ? [x] : [])),
		);
		fc.assert(
			fc.property(gp.array(arbElem).arb(), ({ value }) => {
				expect(fm.invoke(value)[0]).toEqual(filter(pred).invoke(value)[0]);
			}),
		);
	});

	// const arbEntry = gp.record({
	// 	id: gp.string(),
	// 	value: gp.atomic(fc.integer({ min: 0, max: 100 })),
	// 	numbers: gp.array<number>(gp.atomic(fc.integer({ min: 0, max: 100 }))),
	// });
	// type Entry = gp.InferArbValue<typeof arbEntry>;
	// // ({ value, numbers }) => numbers.filter(n => n > value)
	// // ({ value, numbers }) => memo([value], (value) => (n => n > value), (cb) => numbers.filter(cb))
	// const mapper: () => IF<Entry, [number[], number[]]> = () => bind(
	// 	(x: Entry) => x.value,
	// 	(value: number) => MemoComposer
	// 		.create(access<number[], 'numbers', Entry>('numbers'))
	// 		.compose(filter((n: number) => n > value))
	// 		.build(),
	// 	new IncrCache(),
	// )

	// it.skip("complex example: join a filter", () => {
	// 	fc.assert(
	// 		fc.property(gp.array(arbEntry).arb(), ({ value, patches }) => {
	// 			const fn = flatMap();
	// 		}),
	// 	);
	// })
});
