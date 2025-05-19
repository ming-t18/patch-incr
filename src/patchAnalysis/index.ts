import type { Patches } from "../incr/patch";
import type { PatchSep } from "./types";

export const separatePatches = <T>(patches: Patches<T>): PatchSep<T> => {
	if (patches.length === 0) {
		return [];
	}

	if (patches.length === 1) {
		return [
			{
				path: patches[0].path,
				patches: [...patches],
			},
		];
	}

	const minLength = patches.reduce(
		(s, { path }) => {
			if (s === null) {
				return path.length;
			}
			return s > path.length ? path.length : s;
		},
		null as number | null,
	);

	if (minLength === null) {
		return [];
	}
	if (minLength === 0) {
		return [
			{
				path: [],
				patches,
			},
		];
	}

	const entries: PatchSep<T> = [];
	for (const entry of patches) {
		const prefix = entry.path.slice(0, minLength);
		const found = entries.find(({ path: path1 }) => {
			for (let i = 0; i < minLength; i++) {
				if (path1[i] !== prefix[i]) {
					return false;
				}
			}
			return true;
		});

		if (found) {
			found.patches.push(entry);
		} else {
			entries.push({
				path: entry.path.slice(minLength),
				patches: [entry],
			});
		}
	}
	return entries;
};

// all paths disjoint
// sP([P1, P2, P3]) = P1 | P2 | P3
// shortest prefix
// sP([P1, [], P2]) = inseparable
// 1. find shortest path
// 2. disjoint
