import type { Patches } from "patch-incr/patch";
export const GetV = Symbol.for("patch-incr-dual/value");
export const GetD = Symbol.for("patch-incr-dual/patches");

/**
 * "Dual Value".
 *
 * A wrapper holding a value of type `T` and
 * its upcoming change, `Patches<T>`, which is optional.
 */
export interface DV<T> {
	[GetV]: T;
	[GetD]?: Patches<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyDV = DV<any>;

export type InferV<D extends AnyDV> = D[typeof GetV];

/**
 * "Dual Function".
 *
 * A function mapping from a dual values (`DV<Input>`) to another (`DV<Output>`).
 */
export type DF<Input, Output> = (input: DV<Input>) => DV<Output>;

export type BiDF<A, B, Output> = (a: DV<A>, b: DV<B>) => DV<Output>;

export type TriDF<A, B, C, Output> = (
	a: DV<A>,
	b: DV<B>,
	C: DV<C>,
) => DV<Output>;
