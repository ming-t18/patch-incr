import { ifExists, matchUnionFor } from "@/builder/cond";
import { accessFor } from "@/builder/struct";
import { accessWithFor } from "@/builder/struct/access";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

// TODO
describe("cond", () => {});

const genInput = gp.oneof(
	[
		{ weight: 1, arbitrary: gp.constant(null) },
		{ weight: 1, arbitrary: gp.record({ a: gp.integer() }) },
	],
	(x) => (x ? 1 : 0),
);

describe("ifExists", () => {
	propsForIF(genInput, () => ifExists(accessFor<{ a: number }>()("a")));
});

type Left = { type: "left"; value: { a: number } };
type Middle = { type: "middle"; value: { b: { a: number }[] } };
type Right = { type: "right"; value: { c: string } };
type Union = Left | Middle | Right;

const genUnion = gp.oneof(
	[
		{
			weight: 1,
			arbitrary: gp.record<Union>({
				type: gp.constant("left"),
				value: gp.record({ a: gp.integer() }),
			}),
		},
		{
			weight: 1,
			arbitrary: gp.record<Union>({
				type: gp.constant("middle"),
				value: gp.record({ b: gp.array(gp.record({ a: gp.integer() })) }),
			}),
		},
		{
			weight: 1,
			arbitrary: gp.record<Union>({
				type: gp.constant("right"),
				value: gp.record({ c: gp.string() }),
			}),
		},
	],
	(x) => ({ left: 0, middle: 1, right: 2 })[x.type],
);

describe("matchUnion", () => {
	propsForIF(genUnion, () =>
		matchUnionFor<"type", Union>("type")({
			left: accessWithFor<Left>()((x) => x.value.a),
			middle: accessWithFor<Middle>()((x) => x.value.b),
			right: accessWithFor<Right>()((x) => x.value.c),
		}),
	);
});
