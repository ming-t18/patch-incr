import type { GetTracked, PathTracker } from "@/tracked";
import type { AnyIF, IF } from "@/types";

export const CONST = Symbol("iif-Const");
export const APPLY = Symbol("iif-Apply");
export const FORK = Symbol("iif-Fork");

export interface IIF<Input, Output> extends IF<Input, Output> {
	original: (input: Input) => Output;
}

export type Operator<Inputs extends unknown[], Output> = (
	...inputs: Inputs
) => Output;

export interface Node<Output = unknown> {
	[GetTracked]: PathTracker;
	"~output": Output;
}

export type ConstElem<V = unknown> = { [CONST]: V };
export type ApplyElem<F extends AnyIF = AnyIF> = { [APPLY]: F };
export type ForkElem<Fs extends IIFPath[] = IIFPath[]> = { [FORK]: Fs };

export type IIFPathElem = string | number | ApplyElem | ConstElem | ForkElem;
export type IIFPath = IIFPathElem[];

export type Compile = <Input extends WeakKey, Output>(
	func: (input: Input) => Output,
) => IF<Input, Output>;
