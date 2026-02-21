import type { IF } from "../../types";

export interface IIF<Input, Output> extends IF<Input, Output> {
	original: (input: Input) => Output;
}
