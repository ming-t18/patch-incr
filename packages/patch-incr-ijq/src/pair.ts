import * as A from "./arrow";
import { Pair } from "./helpers";
import type { EmptyCtx, Ijq } from "./type";

export { pair } from "./arrow";

export const fst = <A, B, Ctx extends {} = EmptyCtx>(): Ijq<[A, B], A, Ctx> =>
	A.single<[A, B], A, Ctx>(Pair.fst());

export const snd = <A, B, Ctx extends {} = EmptyCtx>(): Ijq<[A, B], B, Ctx> =>
	A.single<[A, B], B, Ctx>(Pair.snd());
