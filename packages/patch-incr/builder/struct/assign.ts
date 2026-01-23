import {
	applyGet,
	applyPatches,
	type Patches,
	type Path,
	replacePatches,
} from "../../patch";
import type { IF } from "../../types";

export const assign = <Input, Output>(
	getInitial: () => Output,
	changes: { path: Path; getValue: IF<Input, unknown> }[],
): IF<Input, Output> => {
	const evaluateAssign = (input: Input) => {
		let value: Output = getInitial();
		for (const { path, getValue } of changes) {
			value = applyPatches(
				value,
				replacePatches(getValue.evaluate(input), path),
			) as never;
		}
		return value;
	};

	const forwardAssign = (
		input: Input,
		dx: Patches<Input>,
		output: Output,
	): Patches<Output> => {
		const dy: Patches<Output> = [];
		for (const { path, getValue } of changes) {
			const dy1 = getValue.forward(input, dx, applyGet(output, path));
			for (const entry of dy1) {
				dy.push({
					...entry,
					path: [...path, ...entry.path],
				} as never);
			}
		}
		return dy;
	};

	return {
		evaluate: evaluateAssign,
		forward: forwardAssign,
	};
};
