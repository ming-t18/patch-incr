import type { DRO, ReplaceOnly } from "../algebra";
import {
	type IFRO,
	applyReplaceOnly,
	getReplaceOnly,
	makeReplaceOnly,
} from "../algebra/replaceOnly";
import type { Apply, IF, Invoke } from "../incr/types";
import { type Cell, isMemoFn } from "./memoFn";

export const identity = <T = unknown>(x: T): T => x;

export const weakMemo = <X extends WeakKey, Y>(
	func: (input: X) => Y,
	memo?: WeakMap<X, Y>,
) => {
	if (!memo && isMemoFn(func)) {
		return func;
	}

	const memo1 = memo ?? new WeakMap();
	return (x: X): Y => {
		if (memo1.has(x)) {
			return memo1.get(x) as Y;
		}
		const y = func(x);
		memo1.set(x, y);
		return y;
	};
};

export const cellWeakMemo = <X, Y>(
	func: (input: X) => Y,
	memo?: WeakMap<Cell<X>, Y>,
) => weakMemo(({ value: x }: Cell<X>) => func(x), memo);

export const atomic = <X, Y, DX, DY>(
	invoke: Invoke<X, Y>,
	ax: Apply<X, DX>,
	ay: Apply<Y, DY>,
): IF<X, Y, DX, DY> => {
	return {
		invoke,
		forward: (x, dx, _y) => {
			const x1 = ax.apply(x, dx);
			if (Object.is(x, x1)) {
				return ay.empty;
			}

			return ay.fromReplace(invoke(x1));
		},
	};
};

export const atomicCell = <X, Y>(f: Invoke<X, Y>): IFRO<Cell<X>, Cell<Y>> => {
	const ax = applyReplaceOnly<Cell<X>>();
	const ay = applyReplaceOnly<Cell<Y>>();
	const invoke = weakMemo<Cell<X>, Cell<Y>>(({ value: x }) => ({
		value: f(x),
	}));
	return {
		invoke,
		forward: (
			x: Cell<X>,
			dx: ReplaceOnly<Cell<X>> | null,
			_y,
		): ReplaceOnly<Cell<Y>> | null => {
			if (dx === null) {
				return null;
			}

			const x1: Cell<X> = ax.apply(x, dx);
			if (Object.is(x, x1)) {
				return ay.empty;
			}

			return ay.fromReplace(invoke(x1));
		},
	};
};

export const composeWeakMemo = <X extends WeakKey, Y, Z, DX, DY, DZ>(
	f1: IF<X, Y, DX, DY>,
	f2: IF<Y, Z, DY, DZ>,
	map1?: WeakMap<X, Y>,
): IF<X, Z, DX, DZ> => {
	const f1m: Invoke<X, Y> = weakMemo(f1.invoke, map1);
	return {
		invoke: (x: X) => f2.invoke(f1m(x)),
		forward: (x, dx, z) => {
			const y = f1m(x);
			const dy = f1.forward(x, dx, y);
			return f2.forward(y, dy, z);
		},
	};
};

export const composeWeakMemo3 = <
	W extends WeakKey,
	X extends WeakKey,
	Y,
	Z,
	DW,
	DX,
	DY,
	DZ,
>(
	f1: IF<W, X, DW, DX>,
	f2: IF<X, Y, DX, DY>,
	f3: IF<Y, Z, DY, DZ>,
	map1?: WeakMap<W, X>,
	map2?: WeakMap<X, Y>,
): IF<W, Z, DW, DZ> => {
	const f1m: Invoke<W, X> = weakMemo(f1.invoke, map1);
	const f2m: Invoke<X, Y> = weakMemo(f2.invoke, map2);
	return {
		invoke: (w: W) => f3.invoke(f2m(f1m(w))),
		forward: (w, dw, z) => {
			const x = f1m(w);
			const dx = f1.forward(w, dw, x);
			const y = f2m(x);
			const dy = f2.forward(x, dx, y);
			return f3.forward(y, dy, z);
		},
	};
};

export const joinTuple = <Args extends unknown[], Ret, DArgs, DRet>(
	join: (...args: Args) => Ret,
	applyArgs: Apply<Args, DArgs>,
	applyRet: Apply<Ret, DRet>,
): IF<Args, Ret, DArgs, DRet> => {
	const invoke = (xs: Args) => join(...xs);
	return {
		invoke,
		forward: (xs, dxs, _y): DRet => {
			if (applyArgs.isEmpty(dxs)) {
				return applyRet.empty;
			}

			const ro = applyArgs.isReplace(dxs);
			if (ro !== null) {
				const xs1 = getReplaceOnly(ro);
				if (xs.every((x, i) => Object.is(x, xs1[i]))) {
					return applyRet.empty;
				}

				return applyRet.fromReplace(invoke(xs1));
			}

			throw new Error("not possible");
		},
	};
};

export const mapChangeToReplaceOnly = <Input, Change>(
	apply: Apply<Input, Change>,
): IF<Input, Input, Change, DRO<Input>> => {
	return {
		invoke: identity,
		forward: (x, dx, _y): DRO<Input> => {
			if (apply.isEmpty(dx)) {
				return null;
			}
			const rep = apply.isReplace(dx);
			if (rep !== null) {
				return rep;
			}

			return makeReplaceOnly(apply.apply(x, dx));
		},
	};
};
