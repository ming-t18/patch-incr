import fc from "fast-check";
import type { Operator } from "@/builder/iif/types";
import { I, type IIF, iif } from "../builder/iif";
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

describe("operators", () => {
	describe("arith", () => {
		const arbPair = gp.record({ a: gp.integer(), b: gp.integer() });
		type Pair = { a: number; b: number };

		describe.each<[string, Operator<[number, number], number>]>([
			["add", I.add],
			["sub", I.sub],
			["mult", I.mult],
			["div", I.div],
		])("%s", (_, op) => {
			const id1: IIF<Pair, number> = iif(({ a, b }: Pair) => op(a, b));
			propEval(arbPair, id1);
			propsForIF(it, arbPair, () => id1);
		});
	});
});

describe("iif", () => {
	const arbEntry = gp.record({
		id: gp.integer(),
		text: gp.string(),
		done: gp.boolean(),
		children: gp.array(
			gp.record({
				id: gp.integer(),
			}),
		),
	});
	// type Entry = gp.InferArbValue<typeof arbEntry>;
	const arbRecord = gp.record({
		str: gp.string(),
		arr1: gp.array(arbEntry, { maxLength: 5 }),
		nested: gp.record({
			bool: gp.boolean(),
			arr: gp.array(gp.string(), { maxLength: 5 }),
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

	describe("using together with arith operators", () => {
		const ifunc = iif((x: Item) => ({
			mult: I.mult(I.length(x.arr1), I.length(x.nested.arr)),
		}));
		propEval(arbRecord, ifunc);
		propsForIF(it, arbRecord, () => ifunc);
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

	describe("array ops", () => {
		describe("getting array length", () => {
			const ifunc = iif((x: Item) => I.length(x.arr1));
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

		describe("performing maps and filters", () => {
			const ifunc = iif((x: Item) => ({
				ids: x.arr1.map((x) => x.id),
				notDone: x.arr1
					.filter(({ done }) => done)
					.map(({ done, text, children }) => ({
						done,
						text,
						nChildren: I.length(children),
					})),
				done: x.arr1
					.filter(({ done }) => done)
					.map(({ done, text, children }) => ({
						done,
						text,
						nChildren: I.length(children),
					})),
			}));
			propEval(arbRecord, ifunc);
			propsForIF(it, arbRecord, () => ifunc);
		});

		const arbExample = gp.record({
			idToFind: gp.integer({ max: 5 }),
			items: gp.array(
				gp.record({
					id: gp.integer({ max: 5 }),
					text: gp.string(),
				}),
				{ maxLength: 10 },
			),
		});
		type Input = gp.InferArbValue<typeof arbExample>;

		describe("invalid constructions", () => {
			it("should reject arithmetic operator due to [Symbol.toPrimitive] being used", () => {
				expect(() => iif(({ items }: Input) => items.length + 1)).toThrow(
					/\[Symbol\.toPrimitive\]/,
				);
			});

			// The callback for the filter is bound, which makes the function invalid
			// Currently there is no linting rule to check for that
			describe.skip("filtering with dependent callback", () => {
				const ifunc = iif(({ idToFind, items }: Input) =>
					items.filter(({ id }) => id === idToFind),
				);
				propEval(arbExample, ifunc);
				propsForIF(it, arbExample, () => ifunc);
			});
		});
	});
});
