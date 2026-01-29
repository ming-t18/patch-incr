import { type Patches, PatchOp } from "patch-incr/patch";
import { type DV, GetD, GetV } from "./types";

export type { DF, DV } from "./types";
export { GetD, GetV } from "./types";

export const single = <T>(value: T): DV<T> => ({
	[GetV]: value,
});
export const create = <T>(value: T, dValue?: Patches<T> | null): DV<T> => ({
	[GetV]: value,
	[GetD]: dValue ?? undefined,
});
export const createReplace = <T>(before: T, after?: T): DV<T> => ({
	[GetV]: before,
	[GetD]: [{ path: [], op: PatchOp.Replace, value: after }],
});
export const toPair = <T>({
	[GetV]: v,
	[GetD]: dv,
}: DV<T>): [T, Patches<T> | null] => [v, dv ?? null];

export const getValue = <T>({ [GetV]: v }: DV<T>): T => v;
export const getPatches = <T>({ [GetD]: d }: DV<T>): Patches<T> | null =>
	d ?? null;
