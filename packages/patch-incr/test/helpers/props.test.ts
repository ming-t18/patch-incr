import { expect } from "bun:test";
import fc from "fast-check";
import { applyPatches, type Patches, reduceReplaceRoot } from "../../patch";
import type { IF } from "../../types";
import type { GenWithPatches } from "./genPatched.test";

export const ensurePatchCoherent = <X, Y, DX = Patches<X>>(
	x: X,
	dx: DX,
	f: IF<X, Y, DX, Patches<Y>>,
	apply = applyPatches as (x: X, dx: DX) => X,
	compare: (actual: Y, expected: Y) => void = (a, e) =>
		expect(a, "failed to verify y = yNext").toStrictEqual(e),
) => {
	//       @dx
	// x -----------> xNext
	// |      ||       |
	// | f    || f'    | f
	// |      ||       |
	// v      \/       v
	// y -----------> yNext
	//        @dy
	//
	// y = f(x)
	// dy = f'(x, dx, y)
	// x @ dx = y @ dy
	//
	let fail = false;
	const xNext = apply(x, dx);
	let y: Y | undefined;
	let dy: Patches<Y> | undefined;
	try {
		y = f.evaluate(x);
		dy = f.forward(x, dx, y);
		const yNext = f.evaluate(xNext);
		const yApply = applyPatches(y, dy);
		try {
			compare(yApply, yNext);
			// console.log({ x, dx, y, dy, xNext, yNext });
		} catch (e) {
			console.error("coherence failure", {
				x,
				y,
				dx,
				dy,
				xNext,
				yApply,
				yNext,
			});
			fail = true;
			throw e;
		}
	} catch (e) {
		if (!fail) {
			console.error("coherence failed to produce a value", {
				x,
				y,
				dx,
				dy,
				xNext,
			});
			console.error(e);
		}
		throw e;
	}
};
export const ensurePatchSplitProperty = <X, Y>(
	x: X,
	dx: Patches<X>,
	f: IF<X, Y>,
) => {
	//
	// dx = dxLeft & dxRight
	//               @dx
	// x ------------------------------> xNext
	// |              ||
	// | f            || f'
	// |              ||
	// v              \/
	// y ------------------------------> yNext
	//               @dy
	//
	//    @dxLeft            @dxRight
	// x ---------> xInterm -----------> xNext1
	// |     ||        |       ||
	// | f   || f'     | f     || f'
	// |     ||        |       ||
	// v     \/        v       \/
	// y1 --------> yInterm -----------> yNext1
	//    @dyLeft            @dyRight
	//
	// y = f(x)
	// y @ dy = y @ dyLeft @ dyRight
	// dy = f'(x, dx, y)
	// dyLeft = f'(x, dxLeft, y)
	// dyRight = f'(x @ dxLeft, dxRight, y @ dyLeft)
	//
	fc.pre(dx.length > 1);
	const i = dx.length === 2 ? 1 : Math.floor(dx.length / 2);
	const y = f.evaluate(x);
	const dy = f.forward(x, dx, y);
	const yNext = applyPatches(y, dy);
	const dxLeft = dx.slice(0, i);
	const dxRight = dx.slice(i);
	const y1 = f.evaluate(x);
	const dyLeft = f.forward(x, dxLeft, y1);
	const xInterm = applyPatches(x, dxLeft);
	const yInterm = applyPatches(y1, dyLeft);

	// must call evaluate before forward on strict mode of some memos
	const yInterm1 = f.evaluate(xInterm);
	expect(yInterm1).toStrictEqual(yInterm);
	const dyRight = f.forward(xInterm, dxRight, yInterm1);

	const dyCombined: Patches<Y> = [...dyLeft, ...dyRight];
	// console.log('LOG', { y, dy, yNext, dxLeft, y1, dyLeft, xInterm, yInterm });
	const yNext1 = applyPatches(y, dyCombined);
	try {
		expect(applyPatches(y, dyCombined)).toStrictEqual(yNext);
	} catch (e) {
		const xNext = applyPatches(x, dx);
		const xNext1 = xNext;
		console.error("patch split failed", {
			x,
			y,
			dx,
			dy,
			xNext,
			dxLeft,
			xInterm,
			dxRight,
			dyLeft,
			yInterm,
			dyRight,
			yNext,
			xNext1,
			yNext1,
		});
		throw e;
	}
};

type It = (name: string, func: () => void) => void;

export const propsForIF = <X, Y, Z = undefined>(
	it: It,
	gen: GenWithPatches<X>,
	getIF: (value: Z) => IF<X, Y>,
	arb = fc.constant(undefined) as fc.Arbitrary<Z>,
) => {
	it("identity patch: f'([]) = []: F(id) = id", () => {
		fc.assert(
			fc.property(arb, gen.arb(), (z, { value: x }) => {
				const f = getIF(z);
				const y = f.evaluate(x);
				const dy = f.forward(x, [], y);
				expect(dy).toStrictEqual([]);
			}),
		);
	});

	it("patch coherent", () => {
		fc.assert(
			fc.property(arb, gen.arb(), (z, { value, patches }) => {
				const f = getIF(z);
				ensurePatchCoherent(value, patches, f);
			}),
		);
	});

	it("patch split: f'(dx1) @ f'(dx2) = f'(dx1 @ dx2): F(g) . F(f) = F(g . f)", () => {
		fc.assert(
			fc.property(arb, gen.arb(), (z, { value, patches }) => {
				const f = getIF(z);
				ensurePatchSplitProperty(value, patches, f);
			}),
		);
	});
};

export const propIsIdentity = <X, Z = undefined>(
	it: It,
	getIF: (value: Z) => IF<X, X>,
	gen: GenWithPatches<X>,
	arb = fc.constant(undefined) as fc.Arbitrary<Z>,
) => {
	it("is effectively identity: f(x) = x", () => {
		fc.assert(
			fc.property(arb, gen.arb(), (z, { value: x }) => {
				const f = getIF(z);
				const y = f.evaluate(x);
				expect(y).toStrictEqual(x);
			}),
		);
	});

	it("is effectively identity: f'(dx) = dx if dx is not replace-root", () => {
		fc.assert(
			fc.property(arb, gen.arb(), (z, { value: x, patches: dx }) => {
				fc.pre(!("replace" in reduceReplaceRoot(dx)));
				const f = getIF(z);
				const y = f.evaluate(x);
				const dy = f.forward(x, dx, y);
				expect(dy).toStrictEqual(dx);
			}),
		);
	});
};

export const ensurePatchLiftingProperty = <
	X,
	Y,
	FX,
	FY,
	DX = Patches<X>,
	DFX = Patches<FX>,
>(
	x: X,
	dx: DX,
	f: IF<X, Y, DX, Patches<Y>>,
	ff: IF<FX, FY, DFX, Patches<FY>>,
	mapValue: (x: X) => FX,
	mapPatch: (dx: DX) => DFX,
	mapPatch1: (dy: Patches<Y>) => Patches<FY>,
	compare: (actual: Patches<FY>, expected: Patches<FY>) => void = (a, e) =>
		expect(a).toStrictEqual(e),
) => {
	fc.pre((dx as Patches<X>).length <= 1);
	const y = f.evaluate(x);
	const dy = f.forward(x, dx, y);
	const fx = mapValue(x);
	const dfx = mapPatch(dx);
	const fy = ff.evaluate(fx);
	const dfy = ff.forward(fx, dfx, fy);
	// bypass test for "changing into itself" for the input
	fc.pre(!Object.is(y, applyPatches(y, dy)));
	try {
		compare(dfy, mapPatch1(dy));
	} catch (e) {
		console.error({ x, dx, y, dy, fx, dfx, fy, dfy });
		throw e;
	}
};

const compareEntries = (a: unknown, b: unknown) =>
	JSON.stringify(a).localeCompare(JSON.stringify(b));

/**
 * Returns a predicate asserting two `IF` have equal outputs and patches (up to commutativity)
 * given same inputs and same patches on the input.
 *
 * Patches are sorted by JSON.stringify before comparing.
 */
export const ensureIFEq =
	<A, B>(func1: IF<A, B>, func2: IF<A, B>) =>
	({ value: x, patches: dx }: { value: A; patches: Patches<A> }) => {
		const y1 = func1.evaluate(x);
		const y2 = func2.evaluate(x);
		expect(func2.evaluate(x)).toEqual(func1.evaluate(x));
		const dy1 = func1.forward(x, dx, y1);
		const dy2 = func2.forward(x, dx, y2);
		expect(dy2.toSorted(compareEntries)).toEqual(dy1.toSorted(compareEntries));
		expect(applyPatches(y1, dy1)).toStrictEqual(applyPatches(y2, dy2));
	};
