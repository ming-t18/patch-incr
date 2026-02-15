import type { IF } from "../types";

/**
 * Placeholder type for the existential type, actually `any`.
 *
 * Cannot be `never` or `unknown` since they will fail assignability tests on `IF['forward']`.
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional
export type ExistsW = any;

export interface IFRNoResidual<A, B> {
	hasResidual?: false;
	func: IF<A, B>;
}

export interface IFRHasResidual<A, B, W = ExistsW> {
	hasResidual: true;
	func: IF<A, [B, W]>;
}

/**
 * Incremental Function with Residual.
 *
 * `IFR` is a monadic interface for composing `IF`s
 * returning a pair witwh "residual" in the form of `[value, residual]`.
 *
 * `IFR` allows the residuals to be passed managed while being composed.
 */
export type IFR<A, B, W = ExistsW> =
	| IFRNoResidual<A, B>
	| IFRHasResidual<A, B, W>;

// IFR<A, B> is technically: exists R. IFR<A, B, R>

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyIFR = IFR<any, any, any>;
