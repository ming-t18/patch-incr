import * as ps from "../../patchSchema";
import { IndexEnd } from "../../patchSchema/types";
import { CannotReduce, PatchOp } from "../patch";
import type { IF } from "../types";
import { forwardWithArraySchema } from "./helpers/forwardArray";

export const slice = <T>(start?: number, end?: number): IF<T[], T[]> => {
	const start1 = start ?? 0;
	const inSchema = ps.array(ps.atomic<T>());
	const outElemSchema = ps.atomic<T>();
	const outSchema = ps.array(outElemSchema);
	const evaluateSlice = (xs: T[]) => xs.slice(start, end);
	const isIndexInRange = (index: number) =>
		!((typeof end === "number" && index >= end) || index < start1);
	const isCopySlice = typeof end !== "number" && typeof start !== "number";
	const isEmptySlice = typeof end === "number" && start1 >= end;
	const forwardSlice = forwardWithArraySchema(
		inSchema,
		outSchema,
		evaluateSlice,
		(xs, entry, _ys) => {
			if (isEmptySlice) {
				return outSchema.empty;
			}

			const index = entry.path[0] === IndexEnd ? xs.length : entry.path[0];
			if ("inner" in entry) {
				if (!isIndexInRange(index)) {
					return outSchema.empty;
				}

				return outSchema.liftIndex(
					index - start1,
					outElemSchema.fromPatchEntries([entry.inner]),
				);
			}
			if (isCopySlice) {
				return outSchema.fromEntries([entry]);
			}

			const op = entry.op;
			if (op === PatchOp.Replace) {
				if (!isIndexInRange(index)) {
					return outSchema.empty;
				}

				return outSchema.fromPatchEntries([
					{
						...entry,
						path: [index - start1],
					},
				]);
			}

			// TODO cases that requires elements to be "bumped over"
			return CannotReduce;
		},
	);
	return {
		evaluate: evaluateSlice,
		forward: forwardSlice,
	};
};
