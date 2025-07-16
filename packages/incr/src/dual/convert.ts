import type { ApplyCombine } from "../algebra";
import type { Patches } from "../incr/patch";
import type { IF } from "../incr/types";
import { dp, dp0, dpr } from "./dp";
import type { DF, DP } from "./types";

export interface Memo<K, V> {
	has: (key: K) => boolean;
	get: (key: K) => V | undefined;
	set: (key: K, value: V) => void;
}

export const dfFromIFNoMemo = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: IF<X, Y, DX, DY>,
): DF<X, Y, DX, DY> => {
	return ([x, dx, fx]: DP<X, DX>) => {
		if (!fx) {
			return dp0(f.evaluate(x));
		}
		const y = f.evaluate(x);
		return dp(y, f.forward(x, dx, y));
	};
};

export const dfFromIF = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: IF<X, Y, DX, DY>,
	memo: Memo<X, Y>,
): DF<X, Y, DX, DY> => {
	const fMemo = (x: X): Y => {
		if (memo.has(x)) {
			return memo.get(x) as Y;
		}
		const y = f.evaluate(x);
		memo.set(x, y);
		return y;
	};

	return ([x, dx, fx]: DP<X, DX>) => {
		if (!fx) {
			return dp0(fMemo(x));
		}
		const y = fMemo(x);
		return dp(y, f.forward(x, dx, y));
	};
};

export const dfFromIFWeakMap = <
	X extends WeakKey,
	Y,
	DX = Patches<X>,
	DY = Patches<Y>,
>(
	f: IF<X, Y, DX, DY>,
): DF<X, Y, DX, DY> => dfFromIF(f, new WeakMap<X, Y>());

export const ifFromDF = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: DF<X, Y, DX, DY>,
	{ empty }: ApplyCombine<Y, DY>,
): IF<X, Y, DX, DY, false> => {
	return {
		evaluate: (x: X): Y => f(dp0(x))[0],
		forward: (x: X, dx: DX, _ignored?: Y): DY => f(dp(x, dx))[1] ?? empty,
	};
};

export const dfFromAtomic = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: (value: X) => Y,
	applyX: ApplyCombine<X, DX>,
	applyY: ApplyCombine<Y, DY>,
): DF<X, Y, DX, DY> => {
	return (xd: DP<X, DX>) => {
		const [x, dx, fx] = xd;
		if (!fx) {
			return dp0(f(x));
		}

		const x1 = applyX.apply(x, dx);
		return dpr(f(x), f(x1), applyY);
	};
};
