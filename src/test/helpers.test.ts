import { describe, expect, it } from "bun:test";
import {
	type RenderForward,
	type RenderFunc,
	renderToString,
} from "../dom/render";
import type { DOMConstruction } from "../dom/types";
import { type Patches, applyPatches } from "../incr/patch";
import type { IF } from "../incr/types";
import type { TodoState } from "../todo_state";

export const ensurePatchCoherent = <X, Y, DX = Patches>(
	x: X,
	dx: DX,
	f: IF<X, Y, DX, Patches>,
	apply = applyPatches as (x: X, dx: DX) => X,
	compare: (actual: Y, expected: Y) => void = (a, e) =>
		expect(a).toStrictEqual(e),
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
	invoke: RenderFunc<State, Action>,
	forward: RenderForward<State, Action>,
	reducer: (state: State, action: Action) => State,
) => {
	const dispatch = (_action: Action) => {};
	const forward1 = forward(dispatch);
	const func: IF<State, DOMConstruction, Action, Patches> = {
		invoke: (state) => invoke(state, dispatch),
		forward: (state, action: Action, domc) => forward1(state, action, domc),
	};
	ensurePatchCoherent<State, DOMConstruction, Action>(
		state,
		action,
		func,
		reducer,
		(a, b) => expect(renderToString(a)).toBe(renderToString(b)),
	);
};
