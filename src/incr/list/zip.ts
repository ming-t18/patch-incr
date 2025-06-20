import * as ps from "../../patchSchema";
import { IndexEnd } from "../../patchSchema/types";
import { CannotReduce, PatchOp, reducePatches } from "../patch";
import type { IF } from "../types";

export const zip = <A, B>(): IF<[A[], B[]], [A, B][]> => {
	const leftSchema = ps.atomic<A>();
	const rightSchema = ps.atomic<B>();
	const leftsSchema = ps.array(leftSchema);
	const rightsSchema = ps.array(rightSchema);
	const _inputSchema = ps.tuple(leftsSchema, rightsSchema);
	const tupleSchema = ps.tuple(leftSchema, rightSchema);
	const _outputSchema = ps.array(tupleSchema);
	const evaluateZip = ([xs, ys]: [A[], B[]]) => {
		const zs: [A, B][] = [];
		const n = xs.length < ys.length ? xs.length : ys.length;
		for (let i = 0; i < n; i++) {
			zs.push([xs[i], ys[i]]);
		}
		return zs;
	};

	const forwardZip = reducePatches(evaluateZip, ([xs, ys], entry, _zs) => {
		const { path, op } = entry;
		if (path.length === 0 || path.length === 1) {
			// replace-root or replace entire single array
			return CannotReduce;
		}

		const [side, index0, ...rest] = path;
		if (typeof side !== "number") {
			return CannotReduce;
		}

		if (typeof index0 !== "number" && index0 !== IndexEnd) {
			return CannotReduce;
		}

		let index: number;
		const sideLength = side === 0 ? xs.length : ys.length;
		const minLength = xs.length < ys.length ? xs.length : ys.length;
		if (index0 === IndexEnd) {
			index = sideLength;
		} else {
			index = index0;
		}

		if (path.length === 2) {
			if (op === PatchOp.Replace) {
				if (index >= minLength) {
					return CannotReduce;
				}
				return [
					{
						op: PatchOp.Replace,
						path: [index, side],
						value: entry.value,
					},
				];
			}

			// TODO handle bumping over elements
			return CannotReduce;
		}

		if (index >= minLength) {
			return CannotReduce;
		}
		return [
			{
				...entry,
				path: [index, side, ...rest],
			},
		];
	});

	return {
		evaluate: evaluateZip,
		forward: forwardZip,
	};
};
