import {
	InvalidPatchEntry,
	isReplaceRootEntry,
	makeReplaceRootEntry,
	type PatchEntry,
	type Patches,
	PatchOp,
} from "../patch";
import type { IFInv } from "../types";

const evaluateComm = <A, B>([a, b]: [A, B]): [B, A] => [b, a];

export const comm = <A, B>(): IFInv<[A, B], [B, A]> => {
	return {
		evaluate: evaluateComm,
		inverseEvaluate: evaluateComm,
		forward: (_x, patches) =>
			patches.map((entry): PatchEntry<[B, A]> => {
				const { path } = entry;
				// [0] -> [1]
				if (path.length >= 1 && path[0] === 0) {
					return { ...entry, path: [1, ...path.slice(1)] } as PatchEntry<never>;
				}
				// [1] -> [0]
				if (path.length >= 1 && path[0] === 1) {
					return { ...entry, path: [0, ...path.slice(1)] } as PatchEntry<never>;
				}

				if (isReplaceRootEntry(entry)) {
					return makeReplaceRootEntry<[B, A]>(evaluateComm(entry.value));
				}

				throw new InvalidPatchEntry("comm:", entry);
			}),
		isTrivial: true,
	};
};

const evaluateAssocRight = <A, B, C>([[a, b], c]: [[A, B], C]): [A, [B, C]] => [
	a,
	[b, c],
];
const evaluateAssocLeft = <A, B, C>([a, [b, c]]: [A, [B, C]]): [[A, B], C] => [
	[a, b],
	c,
];

export const assocRight = <A, B, C>(): IFInv<[[A, B], C], [A, [B, C]]> => {
	return {
		evaluate: evaluateAssocRight,
		inverseEvaluate: evaluateAssocLeft,
		forward: (_x, patches) => {
			const res: PatchEntry<[A, [B, C]]>[] = [];
			for (const entry of patches) {
				const { path, op } = entry;
				// [0, 0] -> [0]
				if (path.length >= 2 && path[0] === 0 && path[1] === 0) {
					res.push({
						...entry,
						path: [0, ...path.slice(2)],
					} as PatchEntry<never>);
					continue;
				}
				// [0, 1] -> [1, 0]
				if (path.length >= 2 && path[0] === 0 && path[1] === 1) {
					res.push({
						...entry,
						path: [1, 0, ...path.slice(2)],
					} as PatchEntry<never>);
					continue;
				}
				// [1] -> [1, 1]
				if (path.length >= 1 && path[0] === 1) {
					res.push({
						...entry,
						path: [1, 1, ...path.slice(1)],
					} as PatchEntry<never>);
					continue;
				}
				// replace [0] -> replace [0], replace [1, 0]
				if (path.length === 1 && path[0] === 0 && op === PatchOp.Replace) {
					const [a, b] = entry.value;
					res.push({
						op: PatchOp.Replace,
						path: [0],
						value: a,
					} as PatchEntry<never>);
					res.push({
						op: PatchOp.Replace,
						path: [1, 0],
						value: b,
					} as PatchEntry<never>);
					continue;
				}

				if (isReplaceRootEntry(entry)) {
					res.push(makeReplaceRootEntry(evaluateAssocRight(entry.value)));
					continue;
				}

				throw new InvalidPatchEntry("assocRight:", entry);
			}
			return res as Patches<[A, [B, C]]>;
		},
		isTrivial: true,
	};
};

export const assocLeft = <A, B, C>(): IFInv<[A, [B, C]], [[A, B], C]> => {
	return {
		evaluate: evaluateAssocLeft,
		inverseEvaluate: evaluateAssocRight,
		forward: (_x, patches, _y) => {
			const res: PatchEntry<[[A, B], C]>[] = [];
			for (const entry of patches) {
				const { path, op } = entry;
				// [0] -> [0, 0]
				if (path.length >= 1 && path[0] === 0) {
					res.push({
						...entry,
						path: [0, 0, ...path.slice(1)],
					} as PatchEntry<never>);
					continue;
				}

				// replace [1] -> replace [0, 1], replace [1]
				if (path.length === 1 && path[0] === 1 && op === PatchOp.Replace) {
					const [b, c] = entry.value;
					res.push({
						op: PatchOp.Replace,
						path: [0, 1],
						value: b,
					} as PatchEntry<never>);
					res.push({
						op: PatchOp.Replace,
						path: [1],
						value: c,
					} as PatchEntry<never>);
					continue;
				}
				// [1, 0] -> [0, 1]
				if (path.length >= 2 && path[0] === 1 && path[1] === 0) {
					res.push({
						...entry,
						path: [0, 1, ...path.slice(2)],
					} as PatchEntry<never>);
					continue;
				}
				// [1, 1] -> [1]
				if (path.length >= 2 && path[0] === 1 && path[1] === 1) {
					res.push({
						...entry,
						path: [1, ...path.slice(2)],
					} as PatchEntry<never>);
					continue;
				}

				if (isReplaceRootEntry(entry)) {
					res.push(makeReplaceRootEntry(evaluateAssocLeft(entry.value)));
					continue;
				}

				throw new InvalidPatchEntry("assocRight:", entry);
			}
			return res as Patches<[[A, B], C]>;
		},
		isTrivial: true,
	};
};
