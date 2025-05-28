import fc from "fast-check";
import { apply } from "../dual";
import {
	access,
	doAccess,
	filterAccessPatches,
	isStrictParent,
	truncatePath,
} from "../dual/access";
import { Finish, makeAccessProxy } from "../dual/proxy/access";
import { type Path, applyPatches } from "../incr/patch";
import * as gp from "./helpers/genPatched.test";

describe("isStrictParent", () => {
	const arbPath = (params?: fc.ArrayConstraints): fc.Arbitrary<Path> =>
		fc.array(fc.oneof(fc.integer({ min: 0 }), fc.string()), params);

	it("examples", () => {
		expect(isStrictParent([], [])).toBe(false);
		expect(isStrictParent([], ["a"])).toBe(true);
		expect(isStrictParent(["a"], [])).toBe(false);
		expect(isStrictParent(["a"], ["a", "b"])).toBe(true);
		expect(isStrictParent(["a", "b"], ["a", "b"])).toBe(false);
		expect(isStrictParent(["c", "b"], ["a", "b"])).toBe(false);
	});

	it("same path => false", () => {
		fc.assert(fc.property(arbPath(), (path) => !isStrictParent(path, path)));
	});

	it("empty prefix => false", () => {
		fc.assert(fc.property(arbPath(), (path) => !isStrictParent(path, [])));
	});

	it("empty parent", () => {
		fc.assert(
			fc.property(
				arbPath(),
				(path) => isStrictParent([], path) === path.length > 0,
			),
		);
	});

	it("empty is strict parent of anything non-empty", () => {
		fc.assert(
			fc.property(
				arbPath(),
				(path) => isStrictParent([], path) === path.length > 0,
			),
		);
	});

	it("truncating parent into non-empty parent preserves result, given all involved non-empty", () => {
		const arbPathWithPartial = arbPath({ minLength: 1 }).chain((path) =>
			fc.tuple(
				fc.constant(path),
				fc
					.integer({ min: 0, max: path.length })
					.map((i) => path.slice(0, i))
					.filter((x) => x.length > 0),
			),
		);
		fc.assert(
			fc.property(
				arbPathWithPartial,
				arbPath({ minLength: 1 }),
				([parent, partialParent], prefix) =>
					isStrictParent(partialParent, prefix) ===
					isStrictParent(parent, prefix),
			),
		);
	});
});

const arbObjWithPatches = gp.record({
	rec1: gp.record({
		integer: gp.integer(),
		str: gp.string(),
	}),
	rec2: gp.record({
		arrayOfRecord: gp.array(
			gp.record({
				f: gp.integer(),
			}),
			{ maxLength: 3 },
		),
		array2OfInteger: gp.array(gp.array(gp.integer()), { maxLength: 3 }),
		array2OfRecord: gp.array(
			gp.array(
				gp.record({
					x: gp.integer(),
					y: gp.string(),
				}),
				{ maxLength: 3 },
			),
		),
	}),
});

const arbPathOnObj: fc.Arbitrary<Path> = arbObjWithPatches
	.arb()
	.map(({ patches }) => patches)
	.filter((p) => p.length > 0)
	.chain((p) => fc.constantFrom(...p.map((e) => e.path)));

describe("filterAccessPatches", () => {
	it("prop patch filtering", () => {
		// (x @ dx)[[path]] = x[[path]] @ filterAccessPatches(dx, path)
		fc.assert(
			fc.property(
				arbObjWithPatches.arb(),
				arbPathOnObj,
				({ value: x, patches: dx }, path) => {
					const dx1 = filterAccessPatches(path, x, dx);
					try {
						expect(doAccess(applyPatches(x, dx), path)).toStrictEqual(
							applyPatches(doAccess(x, path), dx1),
						);
					} catch (e) {
						console.error({
							path,
							x,
							dx,
							dx1,
						});
						console.error(
							"dx1",
							dx.map(({ path: path0 }) => ({
								path0,
								path1: truncatePath(path, path0),
							})),
						);
						throw e;
					}
				},
			),
		);
	});
});

describe("makeAccessProxy", () => {
	it("parallels doAccess", () => {
		fc.assert(
			fc.property(arbObjWithPatches.arb(), arbPathOnObj, ({ value }, path) => {
				const expected = doAccess(value, path);
				const proxy = makeAccessProxy(value, (target, path) =>
					doAccess(target, path),
				);
				fc.pre(typeof expected !== "undefined");
				try {
					expect(
						// @ts-expect-error object is possibly undefined
						doAccess(proxy, path)[Finish],
					).toBe(expected);
				} catch (e) {
					console.error("fail", {
						path,
						proxy,
						expected,
						doA: doAccess(proxy, path),
					});
					throw e;
				}
			}),
		);
	});

	it("forward key", () => {
		const obj = {
			key1: 100,
			key2: {
				x: 3,
				y: "test",
			},
		};
		const p = makeAccessProxy(obj, (target, path) => {
			// console.log('finish', { target, path });
			return doAccess(target, path);
		});
		console.log(Reflect.ownKeys(p));
		console.log(p.key1);
		console.log(p.key1[Finish]);
		console.log(p.key2.x[Finish]);
	});
});
