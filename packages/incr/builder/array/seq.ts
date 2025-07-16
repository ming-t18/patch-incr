import { type Patches, PatchOp } from "../../patch";
import * as ps from "../../patchSchema";
import { IndexEnd } from "../../patchSchema/types";
import type { IF } from "../../types";

const genSeq = (start: number, step: number, length: number): number[] => {
	let value = start;
	const seq: number[] = [];
	for (let i = 0; i < length; i++) {
		seq.push(value);
		value += step;
	}
	return seq;
};

export const seq = (start = 0, step = 1): IF<number, number[]> => {
	const evaluateSeq = (length: number) => genSeq(start, step, length);
	const lengthSchema = ps.atomic<number>();
	const outSchema = ps.array(ps.atomic<number>());
	const forwardSeq = (len: number, dLen: Patches<number>, ys: number[]) => {
		const len1 = lengthSchema.apply(len, dLen);
		if (len1 === len) {
			return outSchema.empty;
		}

		const n = ys.length;
		if (len1 > len) {
			return outSchema.fromPatchEntries(
				genSeq(start + n * step, step, len1 - len).map((value) => ({
					op: PatchOp.Add,
					path: [IndexEnd],
					value,
				})),
			);
		}

		return outSchema.fromPatchEntries(
			genSeq(start + n * step, step, len - len1).map((_value, j) => ({
				op: PatchOp.Remove,
				path: [n - j - 1],
			})),
		);
	};

	return {
		evaluate: evaluateSeq,
		forward: forwardSeq,
	};
};
