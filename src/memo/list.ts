import type { ReplaceOnly } from "../algebra/replaceOnly";
import type { ApplyCombine } from "../incr/types";

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
