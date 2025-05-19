import { CannotReduce, type PatchEntry, PatchOp, type Patches } from "./patch";
import type { IF, IFInv } from "./types";

const invokeComm = <A, B>([a, b]: [A, B]): [B, A] => [b, a];

export const comm = <A, B>(): IFInv<[A, B], [B, A]> => {
	return {
		invoke: invokeComm,
		inverseInvoke: invokeComm,
		forward: (_x, patches, _y) =>
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

				return entry as PatchEntry<never>;
			}),
	};
};

const invokeAssocRight = <A, B, C>([[a, b], c]: [[A, B], C]): [A, [B, C]] => [
	a,
	[b, c],
];
const invokeAssocLeft = <A, B, C>([a, [b, c]]: [A, [B, C]]): [[A, B], C] => [
	[a, b],
	c,
];

export const assocRight = <A, B, C>(): IFInv<[[A, B], C], [A, [B, C]]> => {
	return {
		invoke: invokeAssocRight,
		inverseInvoke: invokeAssocLeft,
		forward: (_x, patches, _y) => {
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

				res.push(entry as PatchEntry<never>);
			}
			return res as Patches<[A, [B, C]]>;
		},
	};
};

export const assocLeft = <A, B, C>(): IFInv<[A, [B, C]], [[A, B], C]> => {
	return {
		invoke: invokeAssocLeft,
		inverseInvoke: invokeAssocRight,
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

				res.push(entry as PatchEntry<never>);
			}
			return res as Patches<[[A, B], C]>;
		},
	};
};
