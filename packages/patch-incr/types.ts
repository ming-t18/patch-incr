import type { Apply, ApplyCombine } from "./algebra";
import type { AccessTypes, TypesKey } from "./builder/typeHelpers";
import type { Patches } from "./patch";

export type { Apply } from "./algebra";

export interface ApplyCombineLift<T, Patch> extends ApplyCombine<T, Patch> {
	liftObjectKey: (key: string, patch: Patch) => Patch;
	liftArrayIndex: (index: number, patch: Patch) => Patch;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApply = Apply<any, any>;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApplyCombine = ApplyCombine<any, any>;

export type Evaluate<Input, Output> = (input: Input) => Output;

export type NoForwardOutput = false;
export type HasForwardOutput = true | false;

export type Forward<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
	ForwardOutput extends boolean = HasForwardOutput,
> = ForwardOutput extends NoForwardOutput
	? (input: Input, change: InputChange, output?: Output) => OutputChange
	: (input: Input, change: InputChange, output: Output) => OutputChange;

export interface IncrementalFunction<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
	ForwardOutput extends boolean = HasForwardOutput,
> {
	evaluate: Evaluate<Input, Output>;
	forward: Forward<Input, Output, InputChange, OutputChange, ForwardOutput>;
	[TypesKey]?: {
		input: Input;
		output: Output;
		inputChange: InputChange;
		outputChange: OutputChange;
	};
}

export type IF<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
	ForwardOutput extends boolean = HasForwardOutput,
> = IncrementalFunction<
	Input,
	Output,
	InputChange,
	OutputChange,
	ForwardOutput
>;

export interface InverseEvaluate<Input, Output> {
	inverseEvaluate: (output: Output) => Input;
}

export type IFInv<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
> = IF<Input, Output, InputChange, OutputChange, NoForwardOutput> &
	InverseEvaluate<Input, Output>;

// biome-ignore lint/suspicious/noExplicitAny: used on constraints
export type AnyIF = IF<any, any, any, any>;

// biome-ignore lint/suspicious/noExplicitAny: used on constraints
export type AnyIFWithInput<Input> = IF<Input, any, any, any>;

export const isIF = <
	Input,
	Output,
	InputChange = Patches,
	OutputChange = Patches,
>(
	value: unknown,
): value is IF<Input, Output, InputChange, OutputChange> => {
	return (
		value !== null &&
		typeof value === "object" &&
		"evaluate" in value &&
		typeof value.evaluate === "function" &&
		"forward" in value &&
		typeof value.forward === "function"
	);
};

export type InferIFInput<T extends AnyIF> = AccessTypes<"input", T>;
export type InferIFOutput<T extends AnyIF> = AccessTypes<"output", T>;
