import { HINT_TRIVIAL } from "../../hints";
import type { IF } from "../../types";
import { atomicFunc } from "..";

export const length = <T>(): IF<T[], number> => ({
	...atomicFunc((xs: T[]) => xs.length),
	hints: HINT_TRIVIAL,
});
