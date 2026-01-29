import type { Patches } from "patch-incr/patch";
import type { IF } from "patch-incr/types";
import type { DF } from "./dv";
import * as Dv from "./dv";

export type { DF } from "./dv";

export const fromIF = <Input, Output>(
	func: IF<Input, Output>,
): DF<Input, Output> => {
	return (dv) => {
		const [x, dx] = Dv.toPair(dv);
		const y = func.evaluate(x);
		if (dx === null) {
			return Dv.create(y);
		}

		const dy = func.forward(x, dx, y);
		return Dv.create(y, dy);
	};
};

export const toIF = <Input, Output>(
	func: DF<Input, Output>,
): IF<Input, Output, Patches<Input>, Patches<Output>, false> => {
	return {
		evaluate: (x) => Dv.getValue(func(Dv.create(x))),
		forward: (x, dx, _): Patches<Output> =>
			Dv.getPatches(func(Dv.create(x, dx))) ?? [],
	};
};

export const fromIFMemo = <Input extends WeakKey, Output>(
	func: IF<Input, Output>,
	map = new WeakMap<Input, Output>(),
): DF<Input, Output> => {
	return (dv) => {
		const [x, dx] = Dv.toPair(dv);
		let y: Output;
		if (map.has(x)) {
			y = map.get(x) as Output;
		} else {
			y = func.evaluate(x);
			map.set(x, y);
		}

		if (dx === null) {
			return Dv.create(y);
		}

		const dy = func.forward(x, dx, y);
		return Dv.create(y, dy);
	};
};
