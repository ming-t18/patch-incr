import type { ChangeBuilder, InferApplyType } from "../../algebra";
import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import * as ps from "../../patchSchema";
import {
	type AnyPatchSchema,
	IndexEnd,
	type PatchSchema,
	type PatchSchemaArray,
	type PatchSchemaArrayEntry,
} from "../../patchSchema/types";
import {
	CannotReduce,
	type PatchAdd,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Patches,
	type Targeted,
	applyPatches,
} from "../patch";
import type { IF } from "../types";

export const forwardWithArraySchema =
	<
		S extends AnyPatchSchema,
		Output,
		Elem = InferApplyType<S>,
		OutputChange = Patches<Output>,
	>(
		inputSchema: PatchSchemaArray<S, Elem>,
		outputSchema: PatchSchema<Output, OutputChange>,
		evaluate: (a: Elem[]) => Output,
		forwardElem: (
			input: Elem[],
			entry: PatchSchemaArrayEntry<Elem>,
			output: Output,
		) => OutputChange | CannotReduce,
	) =>
	(input: Elem[], patches: Patches<Elem[]>, output: Output): OutputChange => {
		const res = inputSchema.analyze(patches);
		if (res === null) {
			return outputSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outputSchema.fromReplace(evaluate(getReplaceOnly(res)));
		}

		let _in: Elem[] = input;
		let _out: Output = output;
		let _res = outputSchema.empty;
		for (const entry of res) {
			const dOut = forwardElem(_in, entry, _out);
			if (dOut === CannotReduce) {
				return outputSchema.fromReplace(
					evaluate(inputSchema.apply(input, patches)),
				);
			}

			_in = inputSchema.apply(_in, inputSchema.fromEntries([entry]));
			_out = outputSchema.apply(_out, dOut);
			_res = outputSchema.combine(_res, dOut);
		}
		return _res;
	};

export const forwardMapPatches = <X, Y>(
	evaluateMap: (xs: X[]) => Y[],
	{ evaluate: f, forward: df }: IF<X, Y, Patches<X>, Patches<Y>>,
) => {
	const inSchema = ps.atomic<X>();
	const inArraySchema = ps.array(inSchema);
	const outSchema = ps.atomic<Y>();
	const outArraySchema = ps.array(outSchema);
	return forwardWithArraySchema(
		inArraySchema,
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
			if (index === IndexEnd) {
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
			if (path[0] === IndexEnd) {
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
