import { atomicFunc, identity } from "../incr/builder";
import { record, template } from "../incr/struct";
import { assign } from "../incr/struct/assign";
import { entries, keys } from "../incr/struct/entries";
import { merge } from "../incr/struct/merge";
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
		c: gp.array(gp.string()),
		d: gp.array(gp.tuple(gp.string())),
	},
	["a", "b", "c", "d"],
);

const arbRec1 = gp.record(
	{
		c: gp.integer(),
		d: gp.string(),
		e: gp.record({ a: gp.string(), b: gp.string() }),
		f: gp.array(gp.tuple(gp.integer(), gp.string())),
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
