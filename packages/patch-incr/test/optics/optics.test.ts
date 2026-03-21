import {
	propIsIdentity,
	propIsIdentitySimple,
	propsForIF,
} from "@test/props.test";
import fc from "fast-check";
import { atomicFunc, constant, identity } from "@/builder";
import * as Arr from "@/builder/array";
import { swap } from "@/builder/array/helpers/arrayPatch";
import { access, record, template0 } from "@/builder/struct";
import * as O from "@/optics";
import type { IF } from "@/types";
import * as gp from "../helpers/genPatched.test";

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

const getPos1 = O.accessPath<Item>()(["pos1"] as const);
const getPos2 = O.accessPath<Item>()(["pos2"] as const);
const pred = ({ x, y }: XY) => y > x;
const getXY = O.compose3(
	O.compose(O.accessPath<Input>()(["items"] as const), O.Array.all()),
	O.plus<Item>()(getPos1, getPos2),
	O.where<XY>(pred),
);

const swapXY: IF<XY, XY> = record({
	x: access<number, "y", XY>("y"),
	y: access<number, "x", XY>("x"),
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
		propsForIF(it, schema, () => O.toTraversal(getXY).getMulti);
	});
	describe("setter with constant", () => {
		const withConst = getXY.set(constant({ x: 0, y: 0 }));
		propsForIF(it, schema, () => withConst);
	});
	describe("setter with id - effectively identity", () => {
		const effId = getXY.set(identity());
		propIsIdentitySimple(it, schema, () => effId);
		propsForIF(it, schema, () => effId);
	});
	describe("setter - swap x and y on all y > x", () => {
		const swapper = getXY.set(swapXY);
		it.skip("examples", () => {
			const values = fc.sample(schema.arb(), { numRuns: 3, seed: 0 });
			for (const { value } of values) {
				console.log(value.items, swapper.evaluate(value).items);
			}
		});
		propsForIF(it, schema, () => swapper);
	});
});
