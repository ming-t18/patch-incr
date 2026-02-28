import * as A from "@/builder/array";
import { fromPair } from "./builder";
import type { IIso } from "./types";

export const zip = <A, B>(): IIso<[A[], B[]], [A, B][]> =>
	fromPair(A.zip<A, B>(), A.unzip<A, B>());

export const unzip = <A, B>(): IIso<[A, B][], [A[], B[]]> =>
	fromPair(A.unzip<A, B>(), A.zip<A, B>());

export const map = <A, B>(func: IIso<A, B>): IIso<A[], B[]> =>
	fromPair(A.map(func.fw), A.map(func.bw));
