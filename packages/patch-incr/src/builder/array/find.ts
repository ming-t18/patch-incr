import type { IF } from "@/types";
import { atomicFunc } from "..";

// TODO determine array changes to avoid re-evaluation

export const findIndex = <T>(pred: (input: T) => boolean): IF<T[], number> =>
	atomicFunc((xs) => xs.findIndex(pred));

export const findLastIndex = <T>(
	pred: (input: T) => boolean,
): IF<T[], number> => atomicFunc((xs) => xs.findLastIndex(pred));
