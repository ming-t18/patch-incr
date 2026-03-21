import { accessPath } from "./access";
import type { ILens } from "./types";

export const fst = <A, B>(): ILens<[A, B], A, [0]> =>
	accessPath<[A, B]>()([0] as [0]);
export const snd = <A, B>(): ILens<[A, B], B, [1]> =>
	accessPath<[A, B]>()([1] as [1]);
