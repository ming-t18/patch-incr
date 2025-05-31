import { patchesBuilder } from "../builder";
import type { Patches } from "../patch";
import type { IF } from "../types";

/**
 *
 * @param f1
 * @param f2
 * @param outBuilder
 * @returns
 */
export const compose = <Input, Interm, Output>(
	f1: IF<Input, Interm>,
	f2: IF<Interm, Output>,
): IF<Input, [Output, Interm]> => {
	const outBuilder = patchesBuilder;
	type ComposeOutputChange = Patches<[Output, Interm]>;

	const invokeCompose = (x: Input): [Output, Interm] => {
		const v = f1.invoke(x);
		return [f2.invoke(v), v];
	};
	const forward = (
		input: Input,
		change: Patches<Input>,
		[output, interm]: [Output, Interm],
	) => {
		const dInterm = f1.forward(input, change, interm);
		const dOutput = f2.forward(interm, dInterm, output);
		return outBuilder.combine<ComposeOutputChange>(
			outBuilder.liftIndex(0, dOutput),
			outBuilder.liftIndex(1, dInterm),
		);
	};
	return {
		invoke: invokeCompose,
		forward,
	};
};
