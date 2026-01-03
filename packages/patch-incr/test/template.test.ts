import fc from "fast-check";
import { atomicFunc, constant } from "../builder";
import { map } from "../builder/array";
import { composer } from "../builder/compose";
import type { XTarget } from "../builder/struct";
import { accessFor, template, xtemplate } from "../builder/struct";
import { getTrackedPath } from "../builder/struct/pathTracker";
import * as gp from "./helpers/genPatched.test";
import { ensureIFEq, propsForIF } from "./helpers/props.test";

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

// Identical to getFunc()
const getFuncXT = () =>
	xtemplate((t: XTarget<Input>, _) => ({
		x: _(t.a),
		y: _(t.b),
		z: _(t.d, mapValue),
		test: {
			x: _(t.a),
			y: _(t.b),
			w: _(t.c),
		},
	}));

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
		propsForIF(it, genInput, getFunc);

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

describe("xtemplate", () => {
	describe("target/use", () => {
		it("should track paths correctly", () => {
			xtemplate((x: XTarget<{ a: number; b: number; c: number }>, _) => {
				_(x.a);
				_(x.b);
				_(x.c);
				expect(getTrackedPath(x)).toEqual([]);
				return {};
			}).evaluate({ a: 0, b: 0, c: 0 });
		});
	});

	it("should throw on captured use function", () => {
		expect(() =>
			xtemplate((t: XTarget<{ x: number }>, _) => ({
				cb: (y: number) => _(t.x) + y,
			}))
				.evaluate({ x: 2 })
				.cb(1),
		).toThrow(
			expect.objectContaining({
				message: expect.stringContaining("anti-capture"),
			}),
		);
	});

	describe("example function with xtemplate", () => {
		propsForIF(it, genInput, getFuncXT);

		it("identical outputs between xtemplate and template versions", () => {
			const [func1, func2] = [getFunc(), getFuncXT()];
			fc.assert(
				fc.property(genInput.arb(), ({ value: x }) => {
					expect(func2.evaluate(x)).toEqual(func1.evaluate(x));
				}),
			);
		});

		it("identical outputs and patches between xtemplate and template versions", () => {
			const [func1, func2] = [getFunc(), getFuncXT()];
			fc.assert(fc.property(genInput.arb(), ensureIFEq(func1, func2)));
		});
	});

	describe("nested xtemplate", () => {
		it("example", () => {
			const f1 = xtemplate(
				(t: XTarget<{ a: { value: number }[]; b: string }>, _) => ({
					x: _({ arr: _(t.a) }, atomicFunc(JSON.stringify)),
				}),
			);
			expect(f1.evaluate({ a: [{ value: 4 }], b: "test" })).toStrictEqual({
				x: `{"arr":[{"value":4}]}`,
			});
		});
	});
});
