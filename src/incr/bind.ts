import type { Patch } from "immer";
import { type Equals, withCache } from "../cache/incr_cache";
import { type StructuralChangeBuilder, patchesBuilder } from "./builder";
import {
	PatchBuilder,
	type Patches,
	applyPatches,
	isEmptyPatches,
} from "./patch";
import type { IF } from "./types";

/**
 * Creates an incremental "let-binding" that is incremental as long as
 * the value of the binding does not change.
 * @param getBind Given input, gets the bound value
 * @param func Given the bound value, returns the `IF` base on the bound value that takes the input.
 */
export const bind = <
	Input,
	Bind,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
>(
	getBind: (input: Input) => Bind,
	getIF: (inv: Bind) => IF<Input, Output, InputChange, OutputChange>,
	bindCache: Map<Input, Bind>,
	apply = applyPatches as (x: Input, dx: InputChange) => Input,
	{ fromReplace } = patchesBuilder,
	bindEquals = Object.is as Equals<Bind>,
): IF<Input, Output, InputChange, OutputChange> => {
	const bind = withCache(getBind, bindCache);
	const invoke = (x: Input): Output => getIF(bind(x)).invoke(x);
	return {
		invoke,
		forward: (x: Input, dx: InputChange, y: Output): OutputChange => {
			const x1 = apply(x, dx);
			const b0 = bind(x);
			const b1 = bind(x1);
			if (!bindEquals(b0, b1)) {
				return fromReplace(invoke(x1)) as OutputChange;
			}
			return getIF(b0).forward(x, dx, y);
		},
	};
};
