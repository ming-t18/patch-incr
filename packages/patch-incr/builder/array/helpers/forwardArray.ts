import type { IF } from "@/types";
import type { InferApplyType } from "../../../algebra";
import { getReplaceOnly, isReplaceOnly } from "../../../algebra/replaceOnly";
import {
	CannotReduce,
	type PatchAdd,
	type Patches,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Path,
	type Targeted,
} from "../../../patch";
import * as ps from "../../../patchSchema";
import type {
	AnyPatchSchema,
	IndexEnd,
	PatchSchema,
	PatchSchemaArray,
	PatchSchemaArrayEntry,
} from "../../../patchSchema/types";

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

export const getMinUpdatedIndex = <T>(
	arr: T[],
	entries: (
		| PatchReplace<[number]>
		| PatchAdd<[number | IndexEnd], T>
		| PatchRemove<[number]>
		| { path: Path }
	)[],
): number => {
	let minIndex = arr.length;
	for (const entry of entries) {
		if (entry.path.length === 0) {
			return 0;
		}

		const index = entry.path[0];

		if (typeof index === "string") {
			continue;
		}

		if (index < minIndex) {
			minIndex = index;
		}
	}
	return minIndex;
};
