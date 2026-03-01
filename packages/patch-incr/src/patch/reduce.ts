import type { Evaluate, Forward } from "../types";
import { applyPatches } from "./apply";
import { isReplaceRoot } from "./helpers";
import type { PatchEntry, Patches } from "./types";
import { PatchOp } from "./types";

export const CannotReduce = Symbol.for("CannotReduce");
export type CannotReduce = typeof CannotReduce;

/**
 * If the patches contains a replace root, simplify it into the replacement value.
 */
export const reduceReplaceRoot = <T>(
	patches: PatchEntry<T>[],
): { replace: T } | PatchEntry<T>[] => {
	if (patches.length === 0) {
		return patches;
	}

	const hasReplaceRoot = patches.findIndex(isReplaceRoot);
	if (hasReplaceRoot !== -1) {
		const patches1 = patches.slice(hasReplaceRoot);
		const initValue: T = patches[hasReplaceRoot].value;
		return { replace: applyPatches(initValue, patches1) };
	}
	return patches;
};

export type ReduceEntry<Input, Output> = (
	input: Input,
	entry: PatchEntry,
	output: Output,
) => Patches<Output> | typeof CannotReduce;

export const reducePatches =
	<Input, Output>(
		evaluate: Evaluate<Input, Output>,
		reduceEntry: ReduceEntry<Input, Output>,
	): Forward<Input, Output> =>
	(input: Input, patches: Patches, output: Output): Patches<Output> => {
		let patches1 = patches;
		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			patches1 = [
				{
					op: PatchOp.Replace,
					path: [],
					value: res.replace,
				},
			] as Patches<Input>;
		}
		return patches1.reduce(
			({ input, patches, output }, entry: PatchEntry<Input>) => {
				const res = reduceEntry(input, entry, output);
				const input1 = applyPatches(input, [entry]);
				if (res === CannotReduce) {
					const output1 = evaluate(input1);
					return {
						input: input1,
						patches: [
							{
								op: PatchOp.Replace,
								path: [],
								value: output1,
							},
						] as Patches<Output>,
						output: output1,
					};
				}
				return {
					input: input1,
					patches: [...patches, ...res],
					output: applyPatches(output, res),
				};
			},
			{
				input,
				patches: [] as Patches<Output>,
				output,
			},
		).patches;
	};

export type ReduceEntryNoOutput<Input> = (
	input: Input,
	entry: PatchEntry,
) => Patches | typeof CannotReduce;

export const reducePatchesNoOutput =
	<Input, Output>(
		evaluate: Evaluate<Input, Output>,
		reduceEntry: ReduceEntryNoOutput<Input>,
	): Forward<Input, Output, Patches<Input>, Patches<Output>, false> =>
	(
		input: Input,
		patches: Patches<Input>,
		_ignoredOutput?: Output,
	): Patches<Output> => {
		let patches1 = patches;
		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			patches1 = [
				{
					op: PatchOp.Replace,
					path: [],
					value: res.replace,
				},
			] as Patches<Input>;
		}
		return patches1.reduce(
			({ input, patches }, entry: PatchEntry<Input>) => {
				const res = reduceEntry(input, entry);
				const input1 = applyPatches(input, [entry]);
				if (res === CannotReduce) {
					const output1 = evaluate(input1);
					return {
						input: input1,
						patches: [
							{
								op: PatchOp.Replace,
								path: [],
								value: output1,
							},
						] as Patches<Output>,
						output: output1,
					};
				}
				return {
					input: input1,
					patches: [...patches, ...res],
				};
			},
			{
				input,
				patches: [] as Patches<Output>,
			},
		).patches;
	};
