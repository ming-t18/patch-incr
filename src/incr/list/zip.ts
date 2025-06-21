import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import * as ps from "../../patchSchema";
import { IndexEnd } from "../../patchSchema/types";
import { type PatchEntry, type Patches, PatchOp } from "../patch";
import type { IF } from "../types";
import { splice } from "./arrayPatchHelpers";
import { getMinUpdatedIndex } from "./forwardList";

export const zip = <A, B>(): IF<[A[], B[]], [A, B][]> => {
	const leftSchema = ps.atomic<A>();
	const rightSchema = ps.atomic<B>();
	const leftsSchema = ps.array(leftSchema);
	const rightsSchema = ps.array(rightSchema);
	const inputSchema = ps.tuple(leftsSchema, rightsSchema);
	const tupleSchema = ps.tuple(leftSchema, rightSchema);
	const outputSchema = ps.array(tupleSchema);
	const evaluateZip = ([xs, ys]: [A[], B[]]) => {
		const zs: [A, B][] = [];
		const n = xs.length < ys.length ? xs.length : ys.length;
		for (let i = 0; i < n; i++) {
			zs.push([xs[i], ys[i]]);
		}
		return zs;
	};

	const forwardZip = (
		pair: [A[], B[]],
		patches: Patches<[A[], B[]]>,
		_zs: [A, B][],
	): Patches<[A, B][]> => {
		const outLen = Math.min(pair[0].length, pair[1].length);
		const res = inputSchema.analyze(patches);
		if (res === null) {
			return outputSchema.empty;
		}

		if (isReplaceOnly(res)) {
			return outputSchema.fromReplace(evaluateZip(getReplaceOnly(res)));
		}

		if (!res[0] && !res[1]) {
			return outputSchema.empty;
		}

		const maybeReplaceOnly = (): Patches<[A, B][]> | null => {
			const dLefts = leftsSchema.analyze(res[0]?.inner ?? leftsSchema.empty);
			const dRights = rightsSchema.analyze(res[1]?.inner ?? rightsSchema.empty);
			if (dLefts === null && dRights === null) {
				return outputSchema.empty;
			}

			if (isReplaceOnly(dLefts)) {
				return null;
			}
			if (isReplaceOnly(dRights)) {
				return null;
			}

			const builder = outputSchema.builder();
			for (const slot of [0, 1] as (0 | 1)[]) {
				const entrySchema = slot === 0 ? leftSchema : rightSchema;
				for (const entry of (slot === 0 ? dLefts : dRights) ?? []) {
					if (entry.path[0] === IndexEnd || entry.path[0] >= outLen) {
						return null;
					}

					if ("inner" in entry) {
						const index = entry.path[0];
						builder.append(
							outputSchema.liftIndex(
								index,
								tupleSchema.liftIndex(
									slot,
									entrySchema.fromPatchEntries([
										entry.inner as PatchEntry<never>,
									]),
								),
							),
						);
					} else {
						if (entry.op !== PatchOp.Replace) {
							return null;
						}
						const index = entry.path[0];
						builder.append(
							outputSchema.liftIndex(
								index,
								tupleSchema.liftIndex(
									slot,
									entrySchema.fromReplace(entry.value as A & B),
								),
							),
						);
					}
				}
			}

			return builder.build();
		};

		// TODO find index dividing between repalce-only and bumping over,
		// and merge both portions

		const res1 = maybeReplaceOnly();
		if (res1 !== null) {
			return res1;
		}

		const [xs, ys] = pair;
		const iMinLeft = getMinUpdatedIndex(xs, res[0]?.inner ?? []);
		const iMinRight = getMinUpdatedIndex(ys, res[1]?.inner ?? []);
		const iStart = Math.min(iMinLeft, iMinRight);

		const pair1 = inputSchema.apply(pair, patches);
		const replacement: [A, B][] = evaluateZip([
			pair1[0].slice(iStart),
			pair1[1].slice(iStart),
		]);
		return outputSchema.fromPatchEntries(
			splice(iStart, outLen - iStart, replacement),
		);
	};

	return {
		evaluate: evaluateZip,
		forward: forwardZip,
	};
};
