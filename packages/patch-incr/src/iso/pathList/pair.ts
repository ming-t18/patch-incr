import { template0 } from "@/builder/struct";
import type { Path } from "@/patch";
import type { PathListOptics } from "./types";

const pathFst: Path = [0];
const pathSnd: Path = [1];
export const fst = <A, B>(): PathListOptics<[A, B], A> =>
	template0(([a, _]: [A, B]) => [[pathFst, a]]);

export const snd = <A, B>(): PathListOptics<[A, B], B> =>
	template0(([_, b]: [A, B]) => [[pathSnd, b]]);
