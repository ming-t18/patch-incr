import type { IF } from "../incr/types";
import type { DF, DP } from "./types";
import { dp } from "./types";

export { dp, isDP } from "./types";
export type { DualFunc, DP, DF } from "./types";
export { record } from "../dual/record";
export { struct } from "../dual/struct";
export { tuple } from "../dual/tuple";
export { patchesBuilder } from "../incr/builder";

export const apply =
	<X, Y, DF, DX, DY>(
		applyChange: (f: (x: X) => Y, df: DF) => (x: X) => Y,
		makeReplace: (y: Y) => DY,
	) =>
	([f, df]: DP<(x: X) => Y, DF>, [x, dx]: DP<X, DX>): DP<Y, DY> =>
		dp(f(x), makeReplace(applyChange(f, df)(x)));

export const atomicReplace =
	<X, Y, DX, DY>(
		apply: (x: X, dx: DX) => X,
		makeReplaceY: (x: Y) => DY,
		func: (x: X) => Y,
	): DF<X, Y, DX, DY> =>
	([x, dx]: DP<X, DX>) =>
		dp(func(x), makeReplaceY(func(apply(x, dx))));

export const toIF = <X, DX, Y, DY>(
	f: DF<X, Y, DX, DY>,
	empty: DX,
): IF<X, Y, DX, DY> => {
	return {
		evaluate: (x: X) => f(dp(x, empty))[0],
		forward: (x: X, dx: DX, _y: Y): DY => f(dp(x, dx))[1],
	};
};
