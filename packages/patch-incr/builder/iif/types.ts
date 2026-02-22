import type { GetTracked, PathTracker } from "@/tracked";
import type { AnyIF, IF } from "@/types";

export const CONST = Symbol("iif-Const");
export const APPLY = Symbol("iif-Apply");

export interface IIF<Input, Output> extends IF<Input, Output> {
	original: (input: Input) => Output;
}

export enum OpKind {
	Single = "Single",
	Multi = "Multi",
}

export interface OpSingle<Input, Output> {
	opKind: OpKind.Single;
	(input: Input): Output;
	// compose: <T extends WeakKey>(input: IF<T, Input>) => IF<T, Output>;
}

export interface OpMulti<Inputs extends unknown[], Output> {
	opKind: OpKind.Multi;
	(input: Inputs): Output;
	// compose: <T extends WeakKey>(input: IF<T, Inputs>) => IF<T, Output>;
}

export interface Node<Output = unknown> {
	[GetTracked]: PathTracker;
	"~output": Output;
}

export type ConstElem<V = unknown> = { [CONST]: V };
export type ApplyElem<F extends AnyIF = AnyIF> = { [APPLY]: F };

export type IIFPathElem = string | number | ApplyElem | ConstElem;
export type IIFPath = IIFPathElem[];

export type Compile = <Input extends WeakKey, Output>(
	func: (input: Input) => Output,
) => IF<Input, Output>;
