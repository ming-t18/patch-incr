import type { IF } from "@/types";
import { compose, composeWithInv } from "../compose";
import { composeMemo } from "../compose/memo";
import { assocRight, fst } from "../pair";
import { distl, distr } from "./dist";
import { flatMap } from "./flatMap";

/** Performs the Cartesian product between two arrays, with the first array being in the outer loop. */
export const cartesian0 = <A, B>(): IF<
	[A[], B[]],
	[[A, B][], [[number[], [A, B][][]], [A, B[]][]]]
> => composeWithInv(compose(distr(), flatMap(distl())), assocRight());

/** Performs the Cartesian product between two arrays, with the first array being in the outer loop. */
export const cartesian = <A, B>(): IF<[A[], B[]], [A, B][]> =>
	composeMemo(distr(), flatMap(distl()), fst());

/** Performs the Cartesian product between two arrays, with the second array being in the outer loop. */
export const cartesianR = <A, B>(): IF<[A[], B[]], [A, B][]> =>
	composeMemo(distl(), flatMap(distr()), fst());
