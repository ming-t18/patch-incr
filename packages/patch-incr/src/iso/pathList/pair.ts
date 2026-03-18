import { accessPath } from "./access";
import type { PathListOptics } from "./types";

export const fst = <A, B>(): PathListOptics<[A, B], A> => accessPath([0]);
export const snd = <A, B>(): PathListOptics<[A, B], B> => accessPath([1]);
