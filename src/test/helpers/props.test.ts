import { expect } from "bun:test";
import fc from "fast-check";
import type { Dispatch } from "../../dom/mount";
import type { RenderForward } from "../../dom/render";
import type { ElementConstruction } from "../../dom/types";
import { type Patches, applyPatches } from "../../incr/patch";
import type { IF } from "../../incr/types";

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
	let y: Y | undefined = undefined;
	let dy: Patches<Y> | undefined = undefined;
	try {
		y = f.invoke(x);
		dy = f.forward(x, dx, y);
		const yNext = f.invoke(xNext);
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

export const ensureRenderPatchCoherent = <State, Action>(
	state: State,
	action: Action,
	render: (state: State, dispatch: Dispatch<Action>) => ElementConstruction,
	makeForward: RenderForward<State, Action>,
	reducer: (state: State, action: Action) => State,
) => {
	const dispatch = (_: Action) => {};
	ensurePatchCoherent(
		state,
		action,
		{
			invoke: (s: State) => render(s, dispatch),
			forward: makeForward(dispatch),
		},
		reducer,
	);
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
	const y = f.invoke(x);
	const dy = f.forward(x, dx, y);
	const fx = mapValue(x);
	const dfx = mapPatch(dx);
	const fy = ff.invoke(fx);
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
