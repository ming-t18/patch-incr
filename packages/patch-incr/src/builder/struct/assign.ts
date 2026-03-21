import { antiProjectPatches } from "@/patch/helpers";
import type { IF } from "@/types";
import {
	applyGet,
	applyPatches,
	type Patches,
	type Path,
	replacePatches,
} from "../../patch";
import type { Merged } from "./merge";

/**
 * Given an initial object and a mapping of changes,
 * returns `I` with the list of changes applied.
 *
 * @param getInitial the function to generate the initial value.
 * @param changes the list of changes. An array from path
 * to the `IF` to evaluate the result.
 */
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

export const assignWith = <
	Input extends Record<string, unknown>,
	Merge extends Record<string, unknown>,
>(
	changes: { path: Path; getValue: IF<Input, unknown> }[],
): IF<Input, Merged<Input, Merge>> => {
	type Output = Merged<Input, Merge>;
	const evaluateAssignWith = (input: Input) => {
		let value = input as Output;
		for (const { path, getValue } of changes) {
			value = applyPatches(
				value,
				replacePatches(getValue.evaluate(input), path),
			) as never;
		}
		return value;
	};

	const forwardAssignWith = (
		input: Input,
		dx: Patches<Input>,
		output: Output,
	): Patches<Output> => {
		if (dx.length === 0) {
			return [];
		}
		let dx1 = dx as Patches<Output> | null;
		for (const { path } of changes) {
			dx1 = antiProjectPatches(path, dx1 as Patches<Output>);
			if (dx1 === null) {
				break;
			}
		}

		if (dx1 === null) {
			const input1 = applyPatches(input, dx);
			return replacePatches(evaluateAssignWith(input1));
		}

		const dy: Patches<Output> = [...dx1];
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
		evaluate: evaluateAssignWith,
		forward: forwardAssignWith,
	};
};
