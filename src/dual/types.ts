import type { Patches } from "../incr/patch";
import { access } from "./access";

export const IsDP = Symbol("IsDP");

// export type DP<X = unknown, DX = unknown> = [X, DX] & {
// 	[IsDP]: true;
// };

export type DualFunc<X, Y, DX, DY> = (input: DP<X, DX>) => DP<Y, DY>;

export type DF<X, Y, DX, DY> = DualFunc<X, Y, DX, DY>;

export class DP<X = unknown, DX = unknown> extends Array {
	readonly [IsDP] = true;
	constructor(value: X, change: DX) {
		super(2);
		this[0] = value;
		this[1] = change;
	}

	access<K extends keyof X>(key: K): DP<X[K], Patches<DX>> {
		return access(this, [key as never]);
	}
}

export const dp = <X, DX>(x: X, dx: DX) => {
	return new DP<X, DX>(x, dx);
};

export const isDP = <X = unknown, DX = unknown>(
	value: unknown,
): value is DP<X, DX> => {
	return value instanceof DP;
};
