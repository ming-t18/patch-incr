import { accessPath } from "./access";
import type { ILens } from "./types";

export const fst = <A, B>(): ILens<[A, B], A> => accessPath([0]);
export const snd = <A, B>(): ILens<[A, B], A> => accessPath([1]);
