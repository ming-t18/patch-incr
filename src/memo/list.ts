import type { ApplyCombine } from "../incr/types";
import type { ReplaceOnly } from "./replaceOnly";

export interface ListChangeSplice<T> {
	remove: [number, number];
	add: T[];
}

export type ListChange<T> = null | ReplaceOnly<T[]> | ListChangeSplice<T>[];

export const listApply = <T, DT>(
	apply: ApplyCombine<T, DT>,
): ApplyCombine<T[], ListChange<T>> => {
	throw new Error();
};
