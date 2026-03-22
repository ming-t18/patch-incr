import type { IF } from "@/types";
import { compose, composeWithInv } from "../compose";
import { composeMemo } from "../compose/memo";
import { assocRight } from "../pair";
import { distl, distr } from "./dist";
import { flatMap, flatMapSingle } from "./flatMap";

/** Performs the Cartesian product between two arrays, with the first array being in the outer loop. */
export const cartesian0 = <A, B>(): IF<
	[A[], B[]],
	[[A, B][], [[number[], [A, B][][]], [A, B[]][]]]
> => composeWithInv(compose(distr(), flatMap(distl())), assocRight());

/** Performs the Cartesian product between two arrays, with the first array being in the outer loop. */
export const cartesian = <A, B>(): IF<[A[], B[]], [A, B][]> =>
	composeMemo(distr(), flatMapSingle(distl()));

/** Performs the Cartesian product between two arrays, with the second array being in the outer loop. */
export const cartesianR = <A, B>(): IF<[A[], B[]], [A, B][]> =>
	composeMemo(distl(), flatMapSingle(distr()));
