import fc from "fast-check";
import { constant } from "@/builder";
import { map } from "@/builder/array";
import { composer } from "@/builder/compose";
import { accessFor, template } from "@/builder/struct";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const genInput = gp.record({
	a: gp.integer(),
	b: gp.array(gp.string()),
	c: gp.tuple(gp.string(), gp.integer()),
	d: gp.array(gp.record({ value: gp.string() })),
});
type Input = gp.InferArbValue<typeof genInput>;
const _I = accessFor<Input>();
const mapValue = map(accessFor<{ value: string }>()("value"));

const getFunc = () =>
	template(
		{
			x: _I("a"),
			y: _I("b"),
			z: composer(_I("d")).pipe(mapValue).build(),
			w: _I("c"),
		},
		({ x, y, z, w }) => ({
			x,
			y,
			z,
			test: { x, y, w },
		}),
	);

describe("template", () => {
	it("should accept constant template", () => {
		expect(template({}, () => ({ x: 1 })).evaluate(0 as never)).toEqual({
			x: 1,
		});
	});

	it("should throw on unused variables", () => {
		expect(() =>
			template({ x: constant(5), unused: constant(0) }, ({ x }) => ({ x1: x })),
		).toThrow();
	});

	describe("example function", () => {
		propsForIF(genInput, getFunc);

		it("no replace root", () => {
			const func = getFunc();
			fc.assert(
				fc.property(genInput.arb(), ({ value: x, patches: dx }) => {
					fc.pre(dx.length > 0 && dx.every((p) => p.path.length > 0));
					const y = func.evaluate(x);
					const dy = func.forward(x, dx, y);
					expect(dy.every((p) => p.path.length > 0));
				}),
			);
		});
	});
});
