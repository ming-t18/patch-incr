import type { DF, DP } from "./types";
import { dp } from "./types";

export const pair =
	<X, Y, DX, DY, DXY>(makeChange: (dx: DX, dy: DY) => DXY) =>
	([x, dx]: DP<X, DX>, [y, dy]: DP<Y, DY>): DP<[X, Y], DXY> =>
		dp([x, y] as [X, Y], makeChange(dx, dy));

export const first =
	<X, Y, DX, DXY>(projFirst: (change: DXY) => DX): DF<[X, Y], X, DXY, DX> =>
	([xy, dxy]: DP<[X, Y], DXY>) =>
		dp(xy[0], projFirst(dxy));

export const second =
	<X, Y, DY, DXY>(projSecond: (change: DXY) => DY): DF<[X, Y], Y, DXY, DY> =>
	([xy, dxy]: DP<[X, Y], DXY>) =>
		dp(xy[1], projSecond(dxy));
