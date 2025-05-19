import type { ReplaceOnly } from "../memo/replaceOnly";
import type { Patches } from "./patch";
import type { AccessTypes, TypesKey } from "./typeHelpers";

export interface Apply<Value, Change> {
	apply: (value: Value, change: Change) => Value;
	readonly empty: Change;
	fromReplace: (value: Value) => Change;
	isEmpty: (change: Change) => boolean;
	isReplace: (change: Change) => ReplaceOnly<Value> | null;
	[TypesKey]?: { value: Value; change: Change };
}

export type InferApplyType<T extends AnyApply> = AccessTypes<"value", T>;

export type InferChangeType<T extends AnyApply> = AccessTypes<"change", T>;

export interface ApplyCombine<Value, Change> extends Apply<Value, Change> {
	combine: (left: Change, right: Change) => Change;
}

export interface ApplyCombineLift<T, Patch> extends ApplyCombine<T, Patch> {
	liftObjectKey: (key: string, patch: Patch) => Patch;
	liftArrayIndex: (index: number, patch: Patch) => Patch;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyApply = Apply<any, any>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyApplyCombine = ApplyCombine<any, any>;

export type Invoke<Input, Output> = (input: Input) => Output;

export type Forward<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
> = (input: Input, change: InputChange, output: Output) => OutputChange;

export interface IncrementalFunction<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
> {
	invoke: Invoke<Input, Output>;
	forward: Forward<Input, Output, InputChange, OutputChange>;
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
> = IncrementalFunction<Input, Output, InputChange, OutputChange>;

export interface InverseInvoke<Input, Output> {
	inverseInvoke: (output: Output) => Input;
}

export type IFInv<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
> = IF<Input, Output, InputChange, OutputChange> & InverseInvoke<Input, Output>;

// biome-ignore lint/suspicious/noExplicitAny: used on constraints
export type AnyIF = IF<any, any, any, any>;

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
		"invoke" in value &&
		typeof value.invoke === "function" &&
		"forward" in value &&
		typeof value.forward === "function"
	);
};

export type InferIFInput<T extends AnyIF> = AccessTypes<"input", T>;
export type InferIFOutput<T extends AnyIF> = AccessTypes<"output", T>;
