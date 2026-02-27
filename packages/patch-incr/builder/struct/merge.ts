import type { AnyTuple } from "@/patchSchema/types";
import type { IF } from "@/types";
import { CannotReduce, PatchOp, shallowCopy } from "../../patch";
import { reducePatchesNoOutput } from "../../patch/reduce";
import { atomicFunc, identity } from "..";
import { composeMemo } from "../compose";
import * as Pair from "../pair";
import { record } from "./record";

export type Merged<
	A extends Record<string, unknown>,
	B extends Record<string, unknown>,
> = A & B & Pick<B, keyof A & keyof B>;

export const merge = <
	A extends Record<string, unknown>,
	B extends Record<string, unknown>,
>(): IF<[A, B], Merged<A, B>> => {
	const evaluateMerge = ([left, right]: [A, B]): Merged<A, B> => ({
		...left,
		...right,
	});
	const forwardMerge = reducePatchesNoOutput(
		evaluateMerge,
		([left, right], entry) => {
			const { path, op } = entry;
			if (path.length === 0 || path.length === 1) {
				return CannotReduce;
			}

			const side = path[0] as number;
			const key = path[1] as string;
			if (side === 0 && key in right) {
				// overwritten by obj2
				return [];
			}

			if (path.length === 2 && side === 1 && key in left) {
				if (op === PatchOp.Remove) {
					return [{ op: PatchOp.Replace, path: [key], value: left[key] }];
				} else if (op === PatchOp.Add || op === PatchOp.Replace) {
					return [{ ...entry, op: PatchOp.Replace, path: path.slice(1) }];
				} else {
					throw new Error("merge: Invalid patch op");
				}
			}

			return [{ ...entry, path: path.slice(1) }];
		},
	);
	return {
		evaluate: evaluateMerge,
		forward: forwardMerge,
	};
};

export const assignKey = <
	Key extends string,
	Value,
	Input extends Record<string, unknown>,
>(
	key: Key,
	getValue: IF<Input, Value>,
): IF<Input, Merged<Input, Record<Key, Value>>> => {
	return composeMemo(
		Pair.pair(identity(), record({ [key]: getValue })),
		merge(),
	);
};

export const assignKeyFor =
	<Input extends Record<string, unknown>>(): (<Key extends string, Value>(
		key: Key,
		getValue: IF<Input, Value>,
	) => IF<[Input, Key], Merged<Input, Record<Key, Value>>>) =>
	() =>
		assignKey as never;
