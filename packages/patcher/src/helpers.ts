import {
	applyGet,
	applyPatches,
	type Patches,
	type Path,
} from "patch-incr/patch";
import type { Ref, Root } from "./types";

/**
 * Given a path element, converts it to a number if it is a
 * non-negative integer in its entire string.
 */
export const toKey = (key: string): Path[number] => {
	if (key.length === 0) {
		return key;
	}
	const parsed = Number(key);
	if (Number.isFinite(parsed) && parsed >= 0) {
		return parsed;
	}
	return key;
};

export const doPatch = <T>(root: Root<T>, patches: Patches<T>) => {
	if (!root._track) {
		return;
	}

	root._patches.push(...patches);
	root._curr = applyPatches(root._curr, patches);
};

export const GetTarget = Symbol.for("patcher-GetTarget");

export function isTrackedRef<T = unknown>(
	value: unknown,
): value is { [GetTarget]: Ref<T> } {
	// @ts-expect-error Accessing [GetTarget]
	return value !== null && typeof value === "object" && !!value[GetTarget];
}

export const unwrapTracked = (value: unknown): unknown => {
	if (isTrackedRef(value)) {
		const { _root: root, _path: path } = value[GetTarget];
		if (!root._track) {
			throw new TypeError("target is untracked");
		}
		return applyGet(root._curr, path);
	}

	return value;
};
