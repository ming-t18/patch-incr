import fc from "fast-check";
import { type IIF, iif } from "../builder/iif";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const propEval = <A, B>(schema: gp.GenWithPatches<A>, ifunc: IIF<A, B>) => {
	const func = ifunc.original;
	it("should evaluate correctly", () => {
		fc.assert(
			fc.property(schema.arb(), ({ value }) =>
				expect(ifunc.evaluate(value)).toStrictEqual(func(value)),
			),
		);
	});
};
describe("iif", () => {
	const arbRecord = gp.record({
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
	type Item = gp.InferArbValue<typeof arbRecord>;

	describe("returning access expression", () => {
		describe("identity function from iif", () => {
			const id1: IIF<Item, Item> = iif((x: Item): Item => x);
			propEval(arbRecord, id1);
			propsForIF(it, arbRecord, () => id1);
		});

		describe("access str from iif", () => {
			const getStr: IIF<Item, string> = iif((x: Item) => x.str);
			propEval(arbRecord, getStr);
			propsForIF(it, arbRecord, () => getStr);
		});

		describe("access nested field from iif", () => {
			const getNested: IIF<Item, boolean> = iif((x: Item) => x.nested.bool);
			propEval(arbRecord, getNested);
			propsForIF(it, arbRecord, () => getNested);
		});
	});

	describe("returning nested objects", () => {
		const ifunc = iif((x: Item) => ({
			bool: x.nested.bool,
			str1: x.str,
			nested: { arr: x.arr1, str2: x.str },
		}));
		propEval(arbRecord, ifunc);
		propsForIF(it, arbRecord, () => ifunc);
	});

	// bail out
	if (1 !== "test".length) {
		return;
	}

	// TODO doesn't work
	describe.skip("array ops", () => {
		describe("getting array length", () => {
			const ifunc = iif((x: Item) => x.arr1.length);
			propEval(arbRecord, ifunc);
			propsForIF(it, arbRecord, () => ifunc);
		});

		describe("performing array map", () => {
			const ifunc = iif((x: Item) => x.arr1.map((x) => x.id));
			propEval(arbRecord, ifunc);
			propsForIF(it, arbRecord, () => ifunc);
		});

		describe("performing array filter", () => {
			const ifunc = iif((x: Item) => x.arr1.filter((x) => x.done));
			propEval(arbRecord, ifunc);
			propsForIF(it, arbRecord, () => ifunc);
		});
	});
});
