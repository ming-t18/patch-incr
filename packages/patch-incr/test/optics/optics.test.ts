import {
	propIsIdentity,
	propIsIdentitySimple,
	propsForIF,
} from "@test/props.test";
import fc from "fast-check";
import { atomicFunc, constant, identity } from "@/builder";
import { access, record } from "@/builder/struct";
import * as O from "@/optics";
import type { IF } from "@/types";
import * as gp from "../helpers/genPatched.test";
import { propsForLens, propsForTraversalIF } from "./props.test";

const xySchema = gp.record({
	x: gp.integer({ min: -5, max: 5 }),
	y: gp.integer({ min: -5, max: 5 }),
});
const itemSchema = gp.record({
	id: gp.integer({ min: -10, max: 10 }),
	name: gp.string({ maxLength: 4 }),
	flag: gp.boolean(),
	pos1: xySchema,
	pos2: xySchema,
});
const schema = gp.record({
	selected: gp.integer(),
	items: gp.array(itemSchema, { maxLength: 5 }),
	test: gp.record({ a: gp.boolean(), b: gp.string({ maxLength: 4 }) }),
});
interface Input extends gp.InferArbValue<typeof schema> {}
interface Item extends gp.InferArbValue<typeof itemSchema> {}
interface XY extends gp.InferArbValue<typeof xySchema> {}

const _item = O.accessPath<Item>();
const _input = O.accessPath<Input>();
const getPos1 = _item(["pos1"] as const);
const getPos2 = _item(["pos2"] as const);
const pred = ({ x, y }: XY) => y > x;
const getXY = O.compose(
	_input(["items"] as const),
	O.Array.all<Item>(),
	O.plus<Item>()(getPos1, getPos2),
	O.where<XY>(pred),
);

const swapXY: IF<XY, XY> = record({
	x: access<number, "y", XY>("y"),
	y: access<number, "x", XY>("x"),
});

describe("XY - record with 2 integers", () => {
	const getX = O.accessPath<XY>()(["x"] as const);
	const getY = O.accessPath<XY>()(["y"] as const);
	describe("getX lens", () => {
		propsForLens(xySchema, gp.integer(), () => getX);
		propsForTraversalIF(xySchema, gp.integer(), () => O.toTraversal(getX));
	});
	describe("getY lens", () => {
		propsForLens(xySchema, gp.integer(), () => getY);
		propsForTraversalIF(xySchema, gp.integer(), () => O.toTraversal(getY));
	});
});

describe("array optics", () => {
	describe("array of integers", () => {
		const arrIntSchema = gp.array(gp.integer(), { maxLength: 10 });
		describe("all", () => {
			const allTrav = O.toTraversal(O.Array.all());
			propIsIdentity(it, arrIntSchema, () => allTrav.getMulti);
			propsForTraversalIF(arrIntSchema, gp.integer(), () => allTrav);
		});

		describe("filter even", () => {
			const evensTrav = O.toTraversal(
				O.Array.filter((x: number) => x % 2 === 0),
			);
			const evensTravWhere = O.toTraversal(
				O.compose(
					O.Array.all<number>(),
					O.where((x: number) => x % 2 === 0),
				),
			) satisfies typeof evensTrav;
			describe("get", () => {
				it("should filter for even values", () => {
					fc.assert(
						fc.property(arrIntSchema.arb(), ({ value: xs }) => {
							expect(evensTrav.getMulti.evaluate(xs)).toStrictEqual(
								xs.filter((x) => x % 2 === 0),
							);
						}),
					);
				});
				it("should be equivalent with the all/where version", () => {
					fc.assert(
						fc.property(arrIntSchema.arb(), ({ value: xs }) => {
							expect(evensTrav.getMulti.evaluate(xs)).toStrictEqual(
								evensTravWhere.getMulti.evaluate(xs),
							);
						}),
					);
				});
			});
			describe("set", () => {
				it("should update only originally even values", () => {
					fc.assert(
						fc.property(
							fc.integer(),
							arrIntSchema.arb(),
							(val1, { value: xs }) => {
								const setter = evensTrav.over(constant(val1));
								expect(setter.evaluate(xs)).toStrictEqual(
									xs.map((x) => (x % 2 === 0 ? val1 : x)),
								);
							},
						),
					);
				});
			});
			propsForTraversalIF(arrIntSchema, gp.integer(), () => evensTrav);
		});
	});

	describe("2D array of integers", () => {
		const arr2IntSchema = gp.array(gp.array(gp.integer(), { maxLength: 10 }), {
			maxLength: 10,
		});
		const all = O.compose(O.Array.all<number[]>(), O.Array.all<number>());
		describe("get all traversal", () => {
			const allTrav = O.toTraversal(all);
			propsForTraversalIF(arr2IntSchema, gp.integer(), () => allTrav);
		});
		const allEvens = O.compose(
			all,
			O.where((x) => x % 2 === 0),
		);
		describe("get all evens traversal", () => {
			const allEvensTrav = O.toTraversal(allEvens);
			propsForTraversalIF(arr2IntSchema, gp.integer(), () => allEvensTrav);
		});
		describe("negate all evens traversal", () => {
			const negAllEvens = allEvens.over(atomicFunc((x) => -x));
			it("should negate all values that are originally even", () => {
				fc.assert(
					fc.property(arr2IntSchema.arb(), ({ value: xss }) => {
						expect(negAllEvens.evaluate(xss)).toStrictEqual(
							xss.map((xs) => xs.map((x) => (x % 2 === 0 ? -x : x))),
						);
					}),
				);
			});
			propsForIF(arr2IntSchema, () => negAllEvens);
		});
	});
});

describe("getXY traversal", () => {
	const travXY = O.toTraversal(getXY).getMulti;
	it.skip("examples", () => {
		const values = fc.sample(schema.arb(), { numRuns: 1, seed: 0 });
		for (const { value } of values) {
			console.log(value, travXY.evaluate(value));
		}
	});

	describe("getter", () => {
		it("should have all y > x", () => {
			fc.assert(
				fc.property(schema.arb(), ({ value }) =>
					travXY.evaluate(value).every(pred),
				),
			);
		});
		it("should have right number of elements", () => {
			fc.assert(
				fc.property(
					schema.arb(),
					({ value }) =>
						travXY.evaluate(value).length ===
						value.items.reduce(
							(n: number, { pos1, pos2 }) =>
								n + (pred(pos1) ? 1 : 0) + (pred(pos2) ? 1 : 0),
							0,
						),
				),
			);
		});
		propsForIF(schema, () => O.toTraversal(getXY).getMulti);
	});
	describe("setter with constant", () => {
		const withConst = getXY.over(constant({ x: 0, y: 0 }));
		it("should be idempotent", () => {
			fc.assert(
				fc.property(schema.arb(), ({ value }) => {
					const y = withConst.evaluate(value);
					return expect(withConst.evaluate(y)).toStrictEqual(y);
				}),
			);
		});
		propsForIF(schema, () => withConst);
	});
	describe("setter with id - effectively identity", () => {
		const effId = getXY.over(identity());
		propIsIdentitySimple(it, schema, () => effId);
		propsForIF(schema, () => effId);
	});
	describe("setter - swap x and y on all y > x", () => {
		const swapper = getXY.over(swapXY);
		it.skip("examples", () => {
			const values = fc.sample(schema.arb(), { numRuns: 3, seed: 0 });
			for (const { value } of values) {
				console.log(value.items, swapper.evaluate(value).items);
			}
		});
		propsForIF(schema, () => swapper);
	});
});
