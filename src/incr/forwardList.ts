import {
	type PatchEntry,
	PatchOp,
	type Patches,
	applyPatches,
	liftPatch,
} from "./patch";
import type { IF } from "./types";

export const forwardMapPatches =
	<X, Y>({ invoke: f, forward: df }: IF<X, Y, Patches<X>, Patches<Y>>) =>
	(xs: X[], patches: Patches<X[]>, ys: Y[]): Patches<Y[]> | null => {
		if (patches.length === 0) {
			return patches as Patches<never>;
		}

		const hasConflicts =
			patches.findIndex(({ path }) => path.length === 0) !== -1;
		if (hasConflicts) {
			return null;
		}

		const res: Patches<Y[]> = [];
		for (const entry of patches) {
			const { path, op } = entry;
			if (path.length > 1) {
				const [i, ...rest] = entry.path;
				if (typeof i !== "number") {
					throw new TypeError("index must be a number");
				}
				const dx = [{ ...entry, path: rest }] as Patches<X>;
				for (const p of liftPatch<Y[]>(i, df(xs[i], dx, ys[i]))) {
					res.push(p);
				}
				continue;
			}

			if (path.length === 0) {
				throw new Error("not possible");
			}

			// path.length === 1
			if (op === PatchOp.Add || op === PatchOp.Replace) {
				res.push({
					...entry,
					value: f(entry.value),
				} as PatchEntry<Y[]>);
				continue;
			}

			if (op === PatchOp.Remove) {
				res.push({ ...entry } as PatchEntry<Y[]>);
				continue;
			}

			throw new Error(`Invalid PatchOp: ${op}`);
		}
		return res;
	};

export const forwardScanPatches =
	<T, Acc>(invokeScan: (xs: T[], acc: Acc) => Acc[]) =>
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
		const rest = invokeScan(xsAfter, ys[iInit - 1]);
		return [
			...removePart,
			...rest.map((value, i) => ({
				op: PatchOp.Replace,
				path: [i + iInit],
				value,
			})),
		];
	};
