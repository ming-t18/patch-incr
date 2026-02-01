/** biome-ignore-all lint/suspicious/noExplicitAny: Needed for default type parameters */
import type { IF } from "patch-incr/types";
export enum FuncKind {
	Single = "1",
	Multiple = "*",
}

export type EmptyCtx = Record<never, unknown>;

export interface IjqSingle<A, B, Ctx extends {} = EmptyCtx> {
	func: IF<[A, Ctx], B>;
	kind: FuncKind.Single;
}

export interface IjqMultiple<A, B, Ctx extends {} = EmptyCtx> {
	func: IF<[A, Ctx], B[]>;
	kind: FuncKind.Multiple;
}

export type Ijq<A, B, Ctx extends {} = EmptyCtx> =
	| IjqSingle<A, B, Ctx>
	| IjqMultiple<A, B, Ctx>;

export type AnyIjq = Ijq<any, any, any>;
