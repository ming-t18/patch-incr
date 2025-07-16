/* biome-ignore-all lint/suspicious/noExplicitAny: for defining type constraints */
import type { Patches } from "../incr/patch";

export type DP0<T> = [T, undefined, false];
export type DP1<T, DT = Patches<T>> = [T, DT, true];

export type DualPair<T, DT = Patches<T>> = DP1<T, DT> | DP0<T>;
export type DP<T, DT = Patches<T>> = DualPair<T, DT>;

export type AnyDP = DP<any, any>;

export type DualFunc<X, Y, DX, DY> = (input: DP<X, DX>) => DP<Y, DY>;
export type DF<X, Y, DX = Patches<X>, DY = Patches<Y>> = DualFunc<X, Y, DX, DY>;

export type AnyDF = DF<any, any>;

export type InferDFInput<F extends AnyDF> = F extends (
	_arg: DP<infer X, any>,
) => any
	? X
	: never;

export type InferDFReturn<F extends AnyDF> = ReturnType<F>[0];
