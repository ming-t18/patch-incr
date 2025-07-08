import type { ApplyCombine } from "../algebra";
import type { Patches } from "../incr/patch";
import type { DP, DP0, DP1 } from "./types";

export type { DP, DP0, DP1 } from "./types";

export const dp = <X, DX>(x: X, dx: DX): DP1<X, DX> => [x, dx, true];

export const dp0 = <X>(x: X): DP0<X> => [x, undefined, false];

export const dpr = <X, DX = Patches<X>>(
	x0: X,
	x1: X,
	ax: ApplyCombine<X, DX>,
): DP1<X, DX> => [x0, ax.fromReplace(x1), true];

export const isDP = <X = unknown, DX = unknown>(
	value: unknown,
): value is DP<X, DX> =>
	Array.isArray(value) && value.length === 3 && typeof value[2] === "boolean";
