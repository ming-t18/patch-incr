import { getReplaceOnly, isReplaceOnly } from "@/algebra/replaceOnly";
import { antiProjectPatches } from "@/patch/helpers";
import * as ps from "@/patchSchema";
import type { IF, NoForwardOutput } from "@/types";
import { CannotReduce, type Patches, PatchOp } from "../../patch";
import { reducePatchesNoOutput } from "../../patch/reduce";
import { identity } from "..";
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
>(): IF<
	[A, B],
	Merged<A, B>,
	Patches<[A, B]>,
	Patches<Merged<A, B>>,
	NoForwardOutput
> => {
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

export const mergeFixed = <
	A extends Record<string, unknown>,
	B extends Record<string, unknown>,
>(
	keys: (string & keyof B)[],
): IF<
	[A, B],
	Merged<A, B>,
	Patches<[A, B]>,
	Patches<Merged<A, B>>,
	NoForwardOutput
> => {
	const pairSchema = ps.tuple(ps.atomic<A>(), ps.atomic<B>());
	const outSchema = ps.atomic<Merged<A, B>>();
	const evaluateMergeFixed = ([left, right]: [A, B]): Merged<A, B> => ({
		...left,
		...right,
	});
	const forwardMergeFixed = (
		x0: [A, B],
		dx: Patches<[A, B]>,
		_ignored?: Merged<A, B>,
	): Patches<Merged<A, B>> => {
		const res = pairSchema.analyze(dx);
		if (res === null) {
			return outSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outSchema.fromReplace(evaluateMergeFixed(getReplaceOnly(res)));
		}

		const dLeft = res[0]?.inner ?? pairSchema.$[0].empty;
		let dLeft1 = dLeft as typeof dLeft | null;
		for (const key of keys) {
			dLeft1 = antiProjectPatches(key, dLeft1 as typeof dLeft);
			if (dLeft1 === null) {
				return outSchema.fromReplace(
					evaluateMergeFixed(pairSchema.apply(x0, dx)),
				);
			}
		}
		if (dLeft1 === null) {
			return outSchema.fromReplace(
				evaluateMergeFixed(pairSchema.apply(x0, dx)),
			);
		}
		const dRight = res[1]?.inner ?? pairSchema.$[1].empty;
		return outSchema.combine(dLeft1 as Patches, dRight as Patches);
	};
	return {
		evaluate: evaluateMergeFixed,
		forward: forwardMergeFixed,
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
