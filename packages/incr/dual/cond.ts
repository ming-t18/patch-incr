import type { ApplyCombine } from "../algebra";
import type { Patches } from "../patch";
import { apply0 } from "./apply0";
import { dp0, dpr } from "./dp";
import type { DF, DP } from "./types";

export const dfCond = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	pred: (value: X) => boolean,
	ifTrue: (value: DP<X, DX>) => DP<Y, DY>,
	ifFalse: (value: DP<X, DX>) => DP<Y, DY>,
	applyX: ApplyCombine<X, DX>,
	applyY: ApplyCombine<Y, DY>,
): DF<X, Y, DX, DY> => {
	return (xdx: DP<X, DX>): DP<Y, DY> => {
		const [x, dx, fx] = xdx;
		if (!fx) {
			type _ShouldBeUndefined = typeof dx;
			return pred(x) ? ifTrue(dp0(x)) : ifFalse(dp0(x));
		}

		const p0 = pred(x);
		const x1 = applyX.apply(x, dx);
		const p1 = pred(x1);
		if (p0 === p1) {
			return p0 ? ifTrue(xdx) : ifFalse(xdx);
		}

		const y0 = p0 ? apply0(ifTrue, x) : apply0(ifFalse, x);
		const y1 = p1 ? apply0(ifTrue, x1) : apply0(ifFalse, x1);
		return dpr(y0, y1, applyY);
	};
};
