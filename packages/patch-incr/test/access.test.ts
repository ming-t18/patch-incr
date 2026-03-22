import * as gp from "@test/genPatched.test";
import { identity } from "@/builder";
import { composeMemo } from "@/builder/compose";
import {
	accessPath,
	accessPathFor,
	accessPathOptFor,
	accessRecord,
	accessWithFor,
} from "@/builder/struct/access";
import type { Path } from "@/patch";
import * as ps from "@/patchSchema";
import type { AnyIF } from "@/types";
import { ensureIFEq, propsForIF } from "./helpers/props.test";

const patchSchema = ps.record({
	a: ps.array(ps.atomic<number>()),
	b: ps.atomic<string>(),
	c: ps.atomic<boolean>(),
	d: ps.record({
		e: ps.array(
			ps.record({
				id: ps.atomic<number>(),
				test: ps.atomic<string>(),
			}),
		),
		f: ps.tuple(ps.atomic<string>(), ps.atomic<number>()),
	}),
});

const gen = gp.record({
	a: gp.array(gp.integer({ min: -5, max: 5 })),
	b: gp.string(),
	c: gp.boolean(),
	d: gp.record({
		e: gp.array(
			gp.record({
				id: gp.integer({ min: -50, max: 50 }),
				test: gp.string(),
			}),
		),
		f: gp.tuple(gp.string(), gp.integer()),
	}),
});

type Target = gp.InferArbValue<typeof gen>;

describe("accessRecord", () => {
	const accessA = accessRecord("a", patchSchema);
	const accessB = accessRecord("b", patchSchema);
	const accessC = accessRecord("c", patchSchema);
	propsForIF(gen, () => accessA);
	propsForIF(gen, () => accessB);
	propsForIF(gen, () => accessC);
});

describe("accessPath", () => {
	const _A = accessPathFor<Target>();
	describe("simple record type", () => {
		describe.each<[Path]>([
			[["a"]],
			[["b"]],
			[["c"]],
			[["d"]],
			[["d", "e"]],
			[["d", "f", 0]],
			[["d", "f", 1]],
		])(`accessPath(%j)`, (path) => {
			const access1 = _A(path);
			propsForIF(gen, () => access1);
		});
	});

	it("access empty path is identity", () => {
		ensureIFEq(identity<Target>(), _A([]));
	});

	describe("composition of accessPath", () => {
		it("[d], [f]", () => {
			ensureIFEq<Target, Target["d"]["f"]>(
				composeMemo(accessPath(["d"]), accessPath(["f"]) as AnyIF),
				accessPath(["d", "f"]),
			);
		});

		it("[d], [f, 1]", () => {
			ensureIFEq<Target, Target["d"]["f"]>(
				composeMemo(accessPath(["d"]), accessPath(["f", 1]) as AnyIF),
				accessPath(["d", "f", 1]),
			);
		});
	});
});

describe("accessPathOpt", () => {
	const arbWithOpt = gp.record({
		opt1: gp.oneof<{ a: number } | undefined>(
			[
				{ weight: 1, arbitrary: gp.constant(undefined) },
				{ weight: 1, arbitrary: gp.record({ a: gp.integer() }) },
			],
			(x) => (x ? 1 : 0),
		),
	});
	const arbArr2D = gp.array(
		gp.array(gp.integer({ min: -5, max: 5 }), { maxLength: 5 }),
		{ maxLength: 5 },
	);
	const arbArr2DObj = gp.array(
		gp.array(gp.record({ x: gp.integer({ min: -5, max: 5 }) }), {
			maxLength: 5,
		}),
		{ maxLength: 5 },
	);
	type Target = gp.InferArbValue<typeof arbWithOpt>;

	describe("on nested object", () => {
		const _A = accessPathOptFor<Target>();
		const f1 = _A(["opt1", "a"]);
		it("evaluate", () => {
			expect(f1.evaluate({ opt1: { a: 1 } })).toBe(1);
			expect(f1.evaluate({ opt1: undefined })).toBeUndefined();
		});
		propsForIF(arbWithOpt, () => f1);
	});

	describe("on array 2D of numbers", () => {
		const _A = accessPathOptFor<number[][]>();
		describe("[2, 1]", () => {
			propsForIF(arbArr2D, () => _A([2, 1]));
		});
	});

	describe("on array 2D of records", () => {
		const _A = accessPathOptFor<{ x: number }[][]>();
		describe("[0]", () => {
			propsForIF(arbArr2DObj, () => _A([0]));
		});
		describe("[0, 0]", () => {
			propsForIF(arbArr2DObj, () => _A([0, 0]));
		});
		describe("[2, 1]", () => {
			propsForIF(arbArr2DObj, () => _A([2, 1]));
		});
		describe("[2, 1, x]", () => {
			propsForIF(arbArr2DObj, () => _A([2, 1, "x"]));
		});
	});
});

describe("accessWith", () => {
	const _A = accessWithFor<Target>();
	const access1 = _A((x) => x.a);
	const access2 = _A((x) => x.b);
	const access3 = _A((x) => x.c);
	const access4 = _A((x) => x.d);
	const access5 = _A((x) => x.d.e);
	const access6 = _A((x) => x.d.f[0]);
	const access7 = _A((x) => x.d.f[1]);
	propsForIF(gen, () => access1);
	propsForIF(gen, () => access2);
	propsForIF(gen, () => access3);
	propsForIF(gen, () => access4);
	propsForIF(gen, () => access5);
	propsForIF(gen, () => access6);
	propsForIF(gen, () => access7);
});
