import { atomicFunc, identity } from "../builder";
import { record, template } from "../builder/struct";
import { assign } from "../builder/struct/assign";
import { entries, fromEntries, keys } from "../builder/struct/entries";
import { merge } from "../builder/struct/merge";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const getAssign1 = record({
	int: 2,
	str: atomicFunc((x: number) => x + 1),
});

describe("assign", () => {
	const af = assign(
		() => ({
			test: 123,
			assign1: {
				int: 1,
				str: "test2",
			},
			record1: {
				xyz: "value",
				abc: [1, 2],
			},
		}),
		[
			{
				path: ["assign1"],
				getValue: getAssign1 as never,
			},
			{
				path: ["record1", "abc", 1],
				getValue: identity<number>() as never,
			},
		],
	);

	propsForIF(it, gp.integer(), () => af);
});

describe("template", () => {
	const af = template(
		{
			assign1: getAssign1,
			number1: identity<number>(),
		},
		(slots) => ({
			test: 123,
			assign1: slots.assign1,
			assign2: slots.assign1,
			record1: {
				xyz: "value",
				abc: [1, slots.number1],
				def: slots.number1,
			},
		}),
	);

	propsForIF(it, gp.integer(), () => af);
});

const arbRec = gp.record(
	{
		a: gp.integer(),
		b: gp.string(),
		c: gp.array(gp.string(), { maxLength: 5 }),
		d: gp.array(gp.tuple(gp.string()), { maxLength: 5 }),
	},
	["a", "b", "c", "d"],
);

const arbRec1 = gp.record(
	{
		c: gp.integer(),
		d: gp.string(),
		e: gp.record({ a: gp.string(), b: gp.string() }),
		f: gp.array(gp.tuple(gp.integer(), gp.string()), { maxLength: 5 }),
	},
	["c", "d", "e", "f"],
);

describe("keys", () => {
	propsForIF(it, arbRec, () => keys());
});

describe("entries", () => {
	propsForIF(it, arbRec, () => entries());
});

describe("merge", () => {
	propsForIF(it, gp.tuple(arbRec, arbRec1), () => merge());
});

// TODO doesn't work due to duplicate entries
describe.skip("fromEntries", () => {
	const arbKey = gp.string({
		minLength: 1,
		maxLength: 2,
		unit: "grapheme-ascii",
	});
	const arbMappingAtomic = gp.array(
		gp.tuple(arbKey, gp.integer({ min: -100, max: 100 })),
		{
			maxLength: 20,
		},
	);
	const arbMappingStruct = gp.array(gp.tuple(arbKey, arbRec1), {
		maxLength: 20,
	});
	describe("atomic values", () => {
		propsForIF(it, arbMappingAtomic, () => fromEntries());
	});

	describe("structural values", () => {
		propsForIF(it, arbMappingStruct, () => fromEntries());
	});
});
