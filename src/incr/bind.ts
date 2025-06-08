import * as ps from "../patchSchema";
import type { Patches } from "./patch";
import type { IF } from "./types";

/**
 * Creates an incremental "let-binding" that is incremental as long as
 * the value of the binding does not change.
 * @param getBind Given input, gets the bound value
 * @param func Given the bound value, returns the `IF` base on the bound value that takes the input,
 * and assuming the input change to the `IF` will change in a way to affect
 * the output of the `getBind`.
 */
export const bind = <Input extends WeakKey, Bind, Output>(
	getBind: IF<Input, Bind>,
	getIF: (invariant: Bind) => IF<Input, Output>,
	memo0?: WeakMap<Input, [Bind, IF<Input, Output>]>,
): IF<Input, Output> => {
	const inputSchema = ps.atomic<Input>();
	const outputSchema = ps.atomic<Output>();
	const bindSchema = ps.atomic<Bind>();
	const memoBind = memo0 ?? new WeakMap();
	const evaluateBind = (x: Input): Output => {
		const pair = memoBind.get(x);
		if (typeof pair !== "undefined") {
			const [_, f] = pair;
			return f.evaluate(x);
		}
		const v = getBind.evaluate(x);
		const f = getIF(v);
		memoBind.set(x, [v, f]);
		return f.evaluate(x);
	};

	const forwardBind = (
		x: Input,
		dx: Patches<Input>,
		y: Output,
	): Patches<Output> => {
		let pair = memoBind.get(x);
		if (typeof pair === "undefined") {
			const v1 = getBind.evaluate(x);
			const f1 = getIF(v1);
			pair = [v1, f1];
			memoBind.set(x, pair);
		}

		const [v, f] = pair;
		//console.log({ x, dx, v, getBind });
		const dv = getBind.forward(x, dx, v);
		//console.log({ dv });

		if (bindSchema.isEmpty(dv)) {
			return f.forward(x, dx, y);
		}

		// console.trace('bind: rebuild: memo found and value changed', { x, dx, y, v, dv });
		return outputSchema.fromReplace(evaluateBind(inputSchema.apply(x, dx)));

		// const x1 = inputSchema.apply(x, dx);
		// const v1 = getBind.evaluate(x1);
		// const f1 = getIF(v1);
		// memoBind.set(x1, [v1, f1]);
		// console.trace('bind: rebuild: memoed value not found', { x, dx, y, v: v1 });
		// return outputSchema.fromReplace(f1.evaluate(inputSchema.apply(x, dx)));
	};

	return {
		evaluate: evaluateBind,
		forward: forwardBind,
	};
};
