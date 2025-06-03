import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import * as ps from "../../patchSchema";
import type {
	AnyPatchSchema,
	PatchSchema,
	PatchSchemaArray,
	PatchSchemaArrayEntry,
} from "../../patchSchema/types";
import {
	type PatchAdd,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Patches,
	type Targeted,
	applyPatches,
} from "../patch";
import type { IF } from "../types";

export const reduceArrayPatches =
	<S extends AnyPatchSchema, T, Output>(
		inArraySchema: PatchSchemaArray<S, T>,
		outSchema: PatchSchema<Output>,
		evaluate: (xs: T[]) => Output,
		reduce: (
			input: T[],
			entry: PatchSchemaArrayEntry<T>,
			output: Output,
		) => Patches<Output>,
	) =>
	(input: T[], patches: Patches<T[]>, output: Output): Patches<Output> => {
		const res = inArraySchema.analyze(patches);
		if (res === null) {
			return outSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outSchema.fromReplace(evaluate(getReplaceOnly(res)));
		}

		let input1 = input;
		let output1 = output;
		const builder = outSchema.builder();
		for (const entry of res) {
			const dys = reduce(input1, entry, output1);
			input1 = inArraySchema.apply(input1, inArraySchema.fromEntries([entry]));
			output1 = outSchema.apply(output1, dys);
			builder.append(dys);
		}
		return builder.build();
	};

export const forwardMapPatches = <X, Y>(
	evaluateMap: (xs: X[]) => Y[],
	{ evaluate: f, forward: df }: IF<X, Y, Patches<X>, Patches<Y>>,
) => {
	const inSchema = ps.atomic<X>();
	const outSchema = ps.atomic<Y>();
	const outArraySchema = ps.array(outSchema);
	return reduceArrayPatches(
		ps.array(inSchema),
		outArraySchema,
		evaluateMap,
		(xs: X[], entry: PatchSchemaArrayEntry<X>, ys: Y[]): Patches<Y[]> => {
			if ("inner" in entry) {
				const [i] = entry.path;
				const dy = df(xs[i], inSchema.fromPatchEntries([entry.inner]), ys[i]);
				return outArraySchema.liftIndex(i, dy);
			}

			const { op } = entry;
			if (op === PatchOp.Add || op === PatchOp.Replace) {
				return outArraySchema.fromEntries([
					{
						...entry,
						value: f(entry.value),
					} as (PatchAdd<[number], Y> | PatchReplace<[number], Y>) &
						Targeted<Y[]>,
				]);
			}
			if (op === PatchOp.Remove) {
				return outArraySchema.fromEntries([
					entry as PatchRemove<[number]> & Targeted<Y[]>,
				]);
			}

			throw new Error("not reachable");
		},
	);
};

export const forwardScanPatches =
	<T, Acc>(evaluateScan: (xs: T[], acc: Acc) => Acc[]) =>
	(xs: T[], patches: Patches<T[]>, ys: Acc[]): Patches<Acc[]> | null => {
		if (patches.length === 0) {
			return patches as Patches<never>;
		}

		const hasConflicts =
			patches.findIndex(({ path }) => path.length === 0) !== -1;
		if (hasConflicts) {
			return null;
		}

		const removePart: Patches<Acc[]> = [];
		const hasRemove =
			patches.findIndex(({ op }) => op === PatchOp.Remove) !== -1;
		if (hasRemove) {
			if (patches.length > 1) {
				return null;
			}

			const index = patches[0].path[0];
			if (index === "-") {
				return null;
			}
			if (typeof index !== "number") {
				throw new Error("index must be a number");
			}
			removePart.push({
				op: PatchOp.Remove,
				path: [index],
			});
		}

		const iInit = patches.reduce((i, { path }) => {
			const j = path[0] as number;
			return j < i ? j : i;
		}, xs.length);

		if (iInit <= 0) {
			return null;
		}

		const reducedPatches: Patches<T[]> = [];
		for (const patch of patches) {
			const { path } = patch;
			if (path[0] === "-") {
				return null;
			}
			if (typeof path[0] !== "number") {
				throw new TypeError("index must be a number");
			}
			const i1 = path[0];
			if (i1 < iInit) {
				continue;
			}

			reducedPatches.push({
				...patch,
				path: path.length === 1 ? [i1 - iInit] : [i1 - iInit, ...path.slice(1)],
			});
		}
		const xsAfter = applyPatches(xs.slice(iInit), reducedPatches);
		const rest = evaluateScan(xsAfter, ys[iInit - 1]);
		return [
			...removePart,
			...rest.map((value, i) => ({
				op: PatchOp.Replace,
				path: [i + iInit],
				value,
			})),
		];
	};
