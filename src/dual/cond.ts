import type { DF, DP } from "./types";
import { dp } from "./types";

export const cond =
	<V, X, Y, DV, DXY>(
		noChange: DV,
		makeReplaceTrue: (x: X) => DXY,
		makeReplaceFalse: (y: Y) => DXY,
	) =>
	(
		cond: (value: DP<V, DV>) => DP<boolean, boolean>,
		ifTrue: DF<V, X, DV, DXY>,
		ifFalse: DF<V, Y, DV, DXY>,
	): DF<V, X | Y, DV, DXY> =>
	(vdv: DP<V, DV>): DP<X | Y, DXY> => {
		const [prevCond, nextCond] = cond(vdv);
		if (prevCond === nextCond) {
			return prevCond ? ifTrue(vdv) : ifFalse(vdv);
		}
		if (nextCond) {
			return dp(
				ifFalse(dp(vdv[0], noChange))[0],
				makeReplaceTrue(ifTrue(vdv)[0]),
			);
		}
		return dp(
			ifTrue(dp(vdv[0], noChange))[0],
			makeReplaceFalse(ifFalse(vdv)[0]),
		);
	};

export const ternary =
	<X, Y, DXY>(
		makeReplaceTrue: (x: X) => DXY,
		makeReplaceFalse: (y: Y) => DXY,
	) =>
	(
		ifTrue: () => DP<X, DXY>,
		ifFalse: () => DP<Y, DXY>,
	): DF<boolean, X | Y, boolean, DXY> =>
	(cond: DP<boolean, boolean>): DP<X | Y, DXY> => {
		const [prevCond, nextCond] = cond;
		if (prevCond === nextCond) {
			return prevCond ? ifTrue() : ifFalse();
		}
		if (nextCond) {
			return dp(ifFalse()[0], makeReplaceTrue(ifTrue()[0]));
		}
		return dp(ifTrue()[0], makeReplaceFalse(ifFalse()[0]));
	};
