import { expect } from "bun:test";
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
	const y = f.invoke(x);
	const dy = f.forward(x, dx, y);
	const xNext = apply(x, dx);
	const yNext = f.invoke(xNext);
	const yApply = applyPatches(y, dy);
	try {
		compare(yApply, yNext);
		// console.log({ x, dx, y, dy, xNext, yNext });
	} catch (e) {
		console.error("coherence failure", {
			x: x,
			y,
			dx: dx,
			dy,
			xNext,
			yApply,
			yNext,
		});
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
	const y = f.invoke(x);
	const dy = f.forward(x, dx, y);
	const fx = mapValue(x);
	const dfx = mapPatch(dx);
	const fy = ff.invoke(fx);
	const dfy = ff.forward(fx, dfx, fy);
	compare(dfy, mapPatch1(dy));
};
