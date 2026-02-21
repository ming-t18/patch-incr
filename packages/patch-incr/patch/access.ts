import { Applier, defaultEntries, hasPatchApplier } from "./applyProtocol";
import { ApplyPatchesError } from "./error";
import type { Path } from "./types";

export function ensureObject(value: unknown): asserts value is object {
	if (value === null || value === undefined || typeof value !== "object") {
		throw new ApplyPatchesError("Must be object/array");
	}
}

export const shallowCopy = <T>(
	value: T,
	alreadyCopied?: WeakSet<WeakKey>,
): T => {
	if (value === null || value === undefined || typeof value !== "object") {
		return value;
	}

	if (alreadyCopied?.has(value)) {
		return value;
	}

	let copied: T;
	if (value instanceof Map) {
		copied = new Map(value) as T;
	} else if (value instanceof Set) {
		copied = new Set(value) as T;
	} else if (Array.isArray(value)) {
		copied = [...value] as never;
	} else if (hasPatchApplier(value)) {
		copied = value[Applier].shallowCopy(value) as T;
	} else {
		copied = { ...value };
	}

	alreadyCopied?.add(copied as WeakKey);
	return copied;
};

/**
 * Given a patchable object, returns a list of entries as observed
 * by `applyPatches` by key (`Path` element) and value.
 * Similar to `Object.entries` and `Map.entries`.
 * @see get
 */
export const patchableEntries = <T>(value: T): [Path[number], unknown][] => {
	if (value === null || value === undefined || typeof value !== "object") {
		return [];
	} else if (Array.isArray(value)) {
		const n = value.length;
		const xs: [number, unknown][] = [];
		for (let i = 0; i < n; i++) {
			xs.push([i, xs[i]]);
		}
		return xs;
	} else if (hasPatchApplier(value)) {
		if (value[Applier].entries) {
			return value[Applier].entries(value) as never;
		}
		return defaultEntries(value[Applier], value) as [never, unknown][];
	}

	return Object.entries(value);
};

export const get = <T, Result = unknown>(
	value: T,
	key: string | number,
): Result => {
	if (hasPatchApplier(value)) {
		return value[Applier].get(value, key) as never;
	}

	if (Array.isArray(value)) {
		if (typeof key === "number") {
			if (key < 0 || key >= value.length) {
				throw new ApplyPatchesError("Array index out of bounds.");
			}
		}
		// throw new ApplyPatchesError(
		// 	"Cannot get field on an array. Only number indexes are supported.",
		// );
	}

	ensureObject(value);
	// @ts-expect-error can't be checked
	return value instanceof Map ? value.get(key) : value[key];
};

export const getOpt = <T, Result = unknown>(
	value: T,
	key: string | number,
): Result | undefined => {
	if (hasPatchApplier(value)) {
		return value[Applier].get(value, key) as never;
	}

	if (value === null || typeof value !== "object") {
		return undefined;
	}

	// @ts-expect-error can't be checked
	return value instanceof Map ? value.get(key) : value[key];
};

export const applyGet = <T, Result = unknown>(value: T, path: Path): Result => {
	let value1: unknown = value;
	for (let i = 0; i < path.length; i++) {
		value1 = get(value1, path[i]);
	}
	return value1 as never;
};

export const applyGetOpt = <T, Result = unknown>(
	value: T,
	path: Path,
): Result | undefined => {
	let value1: unknown | undefined = value;
	for (let i = 0; i < path.length; i++) {
		if (value === null || typeof value !== "object") {
			break;
		}
		value1 = getOpt(value1, path[i]);
	}
	return value1 as never;
};
