import { type Observable, type OperatorFunction, scan } from "rxjs";
import { PatchOp, type Patches, applyPatches } from "../incr/patch";
import type { IF } from "../incr/types";

export const scanPatch = <State, Action>(
	init: State,
	apply: (state: State, action: Action) => State,
): OperatorFunction<Action, State> => scan(apply, init);

export interface ForwardPatchEntry<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
> {
	input: Input;
	output: Output;
	dInput: InputChange;
	dOutput: OutputChange;
	prevInput: Input;
	prevOutput: Output;
}

export const forwardPatch = <
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
>(
	init: Input,
	func: IF<Input, Output, InputChange, OutputChange>,
	applyInput = applyPatches as (input: Input, dInput: InputChange) => Input,
	applyOutput = applyPatches as (
		output: Output,
		dOutput: OutputChange,
	) => Output,
): OperatorFunction<
	InputChange,
	ForwardPatchEntry<Input, Output, InputChange, OutputChange>
> => {
	interface ForwardPatchEntry {
		input: Input;
		output: Output;
		dInput: InputChange;
		dOutput: OutputChange;
		prevInput: Input;
		prevOutput: Output;
	}

	return (di$: Observable<InputChange>): Observable<ForwardPatchEntry> => {
		const initOutput: Output = func.evaluate(init);
		return di$.pipe(
			scan(
				(
					{ input, output }: ForwardPatchEntry,
					dInput: InputChange,
				): ForwardPatchEntry => {
					const nextInput = applyInput(input, dInput);
					// const dOutput = [{ op: PatchOp.Replace, path: [], value:  func.evaluate(nextInput) }] as never;
					const dOutput = func.forward(input, dInput, output);
					const nextOutput = applyOutput(output, dOutput);
					// console.log("forwardPatch", {
					// 	func,
					// 	in: {
					// 		prev: input,
					// 		d: dInput,
					// 		next: nextInput,
					// 	},
					// 	out: {
					// 		prev: output,
					// 		d: dOutput,
					// 		next: nextOutput,
					// 	},
					// });
					return {
						input: nextInput,
						output: nextOutput,
						dInput,
						dOutput,
						prevInput: input,
						prevOutput: output,
					};
				},
				{ input: init, output: initOutput } as never as ForwardPatchEntry,
			),
		);
	};
};
