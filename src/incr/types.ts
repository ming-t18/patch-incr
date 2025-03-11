import type { Patches } from "./patch";

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
}

export type IF<
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
> = IncrementalFunction<Input, Output, InputChange, OutputChange>;

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

// biome-ignore lint/suspicious/noExplicitAny: used in infer
export type InferIFOutput<T extends IF<any, any>> = T extends {
	// biome-ignore lint/suspicious/noExplicitAny: used in infer
	invoke: (...args: any[]) => infer Out;
}
	? Out
	: never;
