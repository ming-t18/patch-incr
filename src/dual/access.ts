import { truncate } from "lodash-es";
import { patchesBuilder } from "../incr/builder";
import {
	type PatchEntry,
	PatchOp,
	type Patches,
	type Path,
	applyPatches,
} from "../incr/patch";
import { type DP, dp } from "./types";

type StartsWithReturn = { inside: Path } | { truncated: Path } | null;

export const truncatePath = (prefix: Path, path: Path): StartsWithReturn => {
	if (prefix.length === 0) {
		return { truncated: path };
	}

	if (path.length === 0) {
		return { inside: prefix };
	}

	if (prefix[0] === path[0]) {
		return truncatePath(prefix.slice(1), path.slice(1));
	}

	return null;
};

export const isStrictParent = (parent: Path, prefix: Path): boolean => {
	if (parent.length >= prefix.length) {
		return false;
	}
	for (let i = 0; i < parent.length; i++) {
		if (parent[i] !== prefix[i]) {
			return false;
		}
	}

	return true;
};

export type AccessPath<T, P extends Path> = P extends []
	? T
	: P extends [infer S extends string | number, ...infer Rest extends Path]
		? T extends Record<S, unknown>
			? AccessPath<T[S], Rest>
			: undefined
		: undefined;

export const doAccess = <T, P extends Path>(
	value: T,
	path: P,
): AccessPath<T, P> => {
	if (path.length === 0) {
		return value as never;
	}

	if (value === null || typeof value !== "object") {
		return undefined as never;
	}

	// @ts-expect-error indexing
	const v: never = value[path[0]];
	if (path.length === 1) {
		return v;
	}

	return doAccess(v, path.slice(1)) as never;
};

export const filterAccessPatches = <T>(
	prefix: Path,
	value: T,
	patches: Patches<T>,
): Patches<T> => {
	const hasConflict = patches.some(
		(p) =>
			p.op === PatchOp.Add ||
			p.op === PatchOp.Remove ||
			isStrictParent(p.path, prefix),
	);
	if (hasConflict) {
		const updated = applyPatches(value, patches);
		const prevAccess = doAccess(value, prefix);
		const newAccess = doAccess(updated, prefix);
		return Object.is(prevAccess, newAccess)
			? []
			: [
					{
						op: PatchOp.Replace,
						path: [],
						value: newAccess,
					} as PatchEntry<never>,
				];
	}

	return patches.flatMap((p) => {
		const t = truncatePath(prefix, p.path);
		if (t === null) {
			return [];
		}
		if ("inside" in t) {
			throw new Error("not possible");
		}
		return [
			{
				...p,
				path: t.truncated,
			},
		];
	});
};

export const access = <T, P extends Path, Res = AccessPath<T, P>>(
	[x, dx]: DP<T, Patches<T>>,
	path: P,
): DP<Res, Patches<Res>> => {
	return dp(doAccess(x, path), filterAccessPatches(path, x, dx)) as never;
};
