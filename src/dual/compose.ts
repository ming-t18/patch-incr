import type { DF, DP } from "./types";

export const compose =
	<X, Y, Z, DX, DY, DZ>(
		f1: DF<X, Y, DX, DY>,
		f2: DF<Y, Z, DY, DZ>,
	): DF<X, Z, DX, DZ> =>
	(xdx: DP<X, DX>): DP<Z, DZ> =>
		f2(f1(xdx));
