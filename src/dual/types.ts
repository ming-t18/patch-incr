export const IsDP = Symbol("IsDP");

export type DP<X = unknown, DX = unknown> = [X, DX] & {
	[IsDP]: true;
};

export type DualFunc<X, Y, DX, DY> = (input: DP<X, DX>) => DP<Y, DY>;

export type DF<X, Y, DX, DY> = DualFunc<X, Y, DX, DY>;

export const dp = <X, DX>(x: X, dx: DX) => {
	const ret = [x, dx];
	// @ts-expect-error
	ret[IsDP] = true;
	return ret as DP<X, DX>;
};

export const isDP = <X = unknown, DX = unknown>(
	value: unknown,
): value is DP<X, DX> => {
	if (!value) {
		return false;
	}

	return typeof value === "object" && IsDP in value && value[IsDP] === true;
};
