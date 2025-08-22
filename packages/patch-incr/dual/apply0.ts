import type { Patches } from "../patch";
import { dp0 } from "./dp";
import type { DF } from "./types";

export const apply0 = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: DF<X, Y, DX, DY>,
	x: X,
): Y => f(dp0(x))[0];
