import fc from "fast-check";
import { iif } from "../builder/iif";
import * as ps from "../patchSchema";
import type { IF } from "../types";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const propEval = <A, B>(
	schema: gp.GenWithPatches<A>,
	ifunc: IF<A, B>,
	func: (input: A) => B,
) => {
	it("should evaluate correctly", () => {
		fc.assert(
			fc.property(schema.arb(), ({ value }) =>
				expect(ifunc.evaluate(value)).toStrictEqual(func(value)),
			),
		);
	});
};
describe("iif", () => {
	const schema = gp.record({
		str: gp.string(),
		arr1: gp.array(
			gp.record({
				id: gp.integer(),
				text: gp.string(),
				done: gp.boolean(),
				children: gp.record({
					id: gp.integer(),
				}),
			}),
		),
		nested: gp.record({
			bool: gp.boolean(),
			arr: gp.array(gp.string()),
		}),
	});
	type Item = gp.InferArbValue<typeof schema>;

	describe("returning access expression", () => {
		describe("identity function from iif", () => {
			const id1: IF<Item, Item> = iif((x: Item): Item => x);
			propEval(schema, id1, (x) => x);
			propsForIF(it, schema, () => id1);
		});

		describe("access str from iif", () => {
			const getStr: IF<Item, string> = iif((x: Item) => x.str);
			propEval(schema, getStr, (x) => x.str);
			propsForIF(it, schema, () => getStr);
		});

		describe("access nested field from iif", () => {
			const getNested: IF<Item, boolean> = iif((x: Item) => x.nested.bool);
			propEval(schema, getNested, (x) => x.nested.bool);
			propsForIF(it, schema, () => getNested);
		});
	});

	describe("returning nested objects", () => {
		const ifunc = iif((x: Item) => ({
			bool: x.nested.bool,
			str1: x.str,
			nested: { arr: x.arr1, str2: x.str },
		}));
		propEval(schema, ifunc, (x) => ({
			bool: x.nested.bool,
			str1: x.str,
			nested: { arr: x.arr1, str2: x.str },
		}));
		propsForIF(it, schema, () => ifunc);
	});

	// bail out
	if (1 !== "test".length) {
		return;
	}

	// TODO doesn't work
	describe.skip("array ops", () => {
		describe("getting array length", () => {
			const ifunc = iif((x: Item) => x.arr1.length);
			propEval(schema, ifunc, (x) => x.arr1.length);
			propsForIF(it, schema, () => ifunc);
		});

		describe("performing array map", () => {
			const ifunc = iif((x: Item) => x.arr1.map((x) => x.id));
			propEval(schema, ifunc, (x) => x.arr1.map((x) => x.id));
			propsForIF(it, schema, () => ifunc);
		});

		describe("performing array filter", () => {
			const ifunc = iif((x: Item) => x.arr1.filter((x) => x.done));
			propEval(schema, ifunc, (x: Item) => x.arr1.filter((x) => x.done));
			propsForIF(it, schema, () => ifunc);
		});
	});
});
