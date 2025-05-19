import fc from "fast-check";
import { applyPatches } from "immer";
import {
	IFGraphBuilder,
	access,
	atomicFunc,
	identity,
	record,
} from "../incr/builder";
import { concat, filter, flatMap, map, scan } from "../incr/list";
import { PatchOp, type Patches, liftPatch } from "../incr/patch";
import type { IF, InferIFOutput } from "../incr/types";
import * as gp from "./helpers/genPatched.test";
import {
	ensurePatchCoherent,
	ensurePatchLiftingProperty,
} from "./helpers/props.test";

describe("concat", () => {
	it("patch coherent", () => {
		fc.assert(
			fc.property(
				gp.atomic(fc.array(fc.array(fc.integer()))),
				({ value, patches }) => {
					ensurePatchCoherent(value, patches, concat());
				},
			),
		);
	});

	it.skip("samples", () => {
		for (const x of fc.sample(
			gp
				.array(gp.array(gp.atomic(fc.integer({ min: 0, max: 100 }))))
				.filter((x) => x.value.length === 0),
			100,
		)) {
			console.log({
				...x,
				value1: applyPatches(x.value, x.patches),
			});
		}
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
			fc.assert(
				fc.property(gp.array(gp.atomic(fc.integer())), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, map(identity()));
				}),
			);
		});

		const arbRecord = gp.record({
			a: gp.atomic(fc.integer()),
			b: gp.array(gp.atomic(fc.integer())),
		});
		it("patch coherent for lists of records", () => {
			fc.assert(
				fc.property(gp.array(arbRecord), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, map(identity()));
				}),
			);
		});

		it("patch lifting for lists of records", () => {
			fc.assert(
				fc.property(arbRecord, (vp) =>
					ensurePatchLiftingPropertyMap(vp, identity()),
				),
			);
		});
	});

	describe("map replace", () => {
		it("patch coherent for integers", () => {
			fc.assert(
				fc.property(
					gp.array(gp.atomic(fc.integer({ min: -100, max: 100 }))),
					({ value, patches }) => {
						ensurePatchCoherent(value, patches, map(atomicFunc((x) => x + 1)));
					},
				),
			);
		});

		it("patch lifting", () => {
			fc.assert(
				fc.property(gp.atomic(fc.integer({ min: -100, max: 100 })), (vp) =>
					ensurePatchLiftingPropertyMap(
						vp,
						atomicFunc((x: number) => x + 1),
					),
				),
			);
		});
	});

	describe("map map replace", () => {
		const arbElem = gp.array(gp.atomic(fc.integer()));
		const mapping = map(atomicFunc((x: number) => x + 1));

		it("patch coherent for integers", () => {
			fc.assert(
				fc.property(gp.array(arbElem), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, map(mapping));
				}),
			);
		});

		it("patch lifting", () => {
			fc.assert(
				fc.property(arbElem, (vp) =>
					ensurePatchLiftingPropertyMap(vp, mapping),
				),
			);
		});
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
				fc.property(gp.array(arbElem), ({ value, patches }) => {
					ensurePatchCoherent(value, patches, scan(mapping, 0));
				}),
			);
		});
	});

	describe("scan record", () => {
		const arbElem = gp.record(
			{
				add: gp.atomic(fc.integer({ min: -100, max: 100 })),
				mult: gp.atomic(fc.integer({ min: -5, max: 5 })),
				concat: gp.atomic(
					fc.option<string, undefined>(fc.string({ unit: "grapheme-ascii" })),
				),
				combined: gp.atomic(fc.bigInt()),
			},
			["concat"],
		);
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
			for (const x of fc.sample(arbElem, 100)) {
				console.log(x);
			}
		});

		it("path coherent", () => {
			fc.assert(
				fc.property(gp.array(arbElem), ({ value, patches }) => {
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

const arbElem0 = gp.atomic(fc.integer({ min: -100, max: 100 }));
const arbElem = gp.record({
	str: gp.atomic(fc.string()),
	num: gp.atomic(fc.integer({ min: -100, max: 100 })),
});

describe("concat", () => {
	it("concat is patch coherent", () => {
		fc.assert(
			fc.property(
				gp.array(gp.array<number>(arbElem0)),
				({ value, patches }) => {
					ensurePatchCoherent(value, patches, concat());
				},
			),
		);
	});

	const arbElem = gp.record({
		str: gp.atomic(fc.string()),
		num: gp.atomic(fc.integer({ min: -100, max: 100 })),
	});
	it("concat on record is patch coherent", () => {
		fc.assert(
			fc.property(gp.array(gp.array(arbElem)), ({ value, patches }) => {
				ensurePatchCoherent(value, patches, concat());
			}),
		);
	});
});

describe("filter", () => {
	describe("filter false", () => {
		it("filter false is patch coherent", () => {
			fc.assert(
				fc.property(gp.array<number>(arbElem0), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						filter(() => false),
					);
				}),
			);
		});
	});

	describe("filter true", () => {
		it("filter true is patch coherent", () => {
			fc.assert(
				fc.property(gp.array<number>(arbElem0), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						filter(() => true),
					);
				}),
			);
		});
	});

	describe("filter is even", () => {
		it("filter is even is patch coherent", () => {
			fc.assert(
				fc.property(gp.array<number>(arbElem0), ({ value, patches }) => {
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
			fc.assert(
				fc.property(gp.array(arbElem), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						filter(({ str, num }) => (str.length + num) % 2 === 0),
					);
				}),
			);
		});
	});
});

describe("flatMap", () => {
	const arbElem0 = gp.atomic(fc.integer({ min: 0, max: 100 }));

	describe("flatMap on atomic values", () => {
		it("flatMap is patch coherent", () => {
			fc.assert(
				fc.property(gp.array(arbElem0), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						flatMap(
							atomicFunc((x) =>
								Array(x)
									.fill(null)
									.map((i) => i + 2),
							),
						),
					);
				}),
			);
		});
	});

	describe("flatMap on record values", () => {
		it("flatMap is patch coherent", () => {
			fc.assert(
				fc.property(gp.array(arbElem), ({ value, patches }) => {
					ensurePatchCoherent(
						value,
						patches,
						flatMap(
							atomicFunc((x) =>
								Array(3 + (x.num % 2) + (x.str.length % 100))
									.fill(null)
									.map((i) => i + 2),
							),
						),
					);
				}),
			);
		});
	});

	it("filter can be expressed in terms of flatMap", () => {
		const pred = ({ str, num }: gp.InferArbValue<typeof arbElem>) =>
			str.length + (num % 2) === 0;
		fc.assert(
			fc.property(gp.array(arbElem), ({ value, patches }) => {
				expect(
					flatMap(
						atomicFunc((x: gp.InferArbValue<typeof arbElem>) =>
							pred(x) ? [x] : [],
						),
					).invoke(value)[0],
				).toEqual(filter(pred).invoke(value)[0]);
			}),
		);
	});

	// const arbEntry = gp.record({
	// 	id: gp.atomic(fc.string()),
	// 	value: gp.atomic(fc.integer({ min: 0, max: 100 })),
	// 	numbers: gp.array<number>(gp.atomic(fc.integer({ min: 0, max: 100 }))),
	// });
	// type Entry = gp.InferArbValue<typeof arbEntry>;
	// // ({ value, numbers }) => numbers.filter(n => n > value)
	// // ({ value, numbers }) => memo([value], (value) => (n => n > value), (cb) => numbers.filter(cb))
	// const mapper: () => IF<Entry, [number[], number[]]> = compose(
	// 	access('value')
	// )

	// it("complex example: join a filter", () => {
	// 	fc.assert(
	// 		fc.property(gp.array(arbEntry), ({ value, patches }) => {
	// 			const fn = flatMap();
	// 		}),
	// 	);
	// })
});
