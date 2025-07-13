import { IndexEnd } from "../../patchSchema/types";
import type {
	PatchCopy,
	PatchEntry,
	Patches,
	PatchesExtended,
	PatchMove,
	PatchSwap,
	Path,
} from "./types";
import { PatchOp, PatchOpExtended } from "./types";

export class ApplyPatchesError extends Error {}

export const shallowCopy = <T>(value: T): T => {
	if (value === null || value === undefined || typeof value !== "object") {
		return value;
	}

	if (value instanceof Map) {
		return new Map(value) as T;
	}
	if (value instanceof Set) {
		return new Set(value) as T;
	}
	if (Array.isArray(value)) {
		return [...value] as never;
	}
	return { ...value };
};

export const applyShallowAssign = <T, Assign = unknown>(
	base: T,
	key: string | number,
	value: Assign,
): T => {
	const copied = shallowCopy(base);
	if (copied instanceof Map) {
		copied.set(key, value);
	} else {
		// @ts-expect-error Can't be checked
		copied[key] = value;
	}
	return copied;
};

export const applyAccess = <T, Result = unknown>(
	value: T,
	key: string | number,
): Result => {
	if (value === null || value === undefined || typeof value !== "object") {
		throw new ApplyPatchesError("Cannot access");
	}

	// @ts-expect-error can't be checked
	return value instanceof Map ? value.get(key) : value[key];
};

export const applyGet = <T, Result = unknown>(value: T, path: Path): Result => {
	let value1: unknown = value;
	for (let i = 0; i < path.length; i++) {
		value1 = applyAccess(value1, path[i]);
	}
	return value1 as never;
};

const applyRemove = <T, Deleted = unknown>(
	base: T,
	path: Path,
	pathIndex = 0,
): [T, Deleted] => {
	if (pathIndex >= path.length) {
		// @ts-expect-error Assuming T contains undefined
		return [undefined, base];
	}

	const key = path[pathIndex];
	if (pathIndex + 1 < path.length) {
		const [replacement, deleted] = applyRemove(
			applyAccess(base, key),
			path,
			pathIndex + 1,
		);
		return [applyShallowAssign(base, key, replacement), deleted as Deleted];
	}

	const base1 = shallowCopy(base);
	let deleted: Deleted;
	if (base1 instanceof Map) {
		deleted = base1.get(key);
		base1.delete(key);
	} else if (base1 instanceof Set) {
		throw new ApplyPatchesError("Can't delete from set");
	} else if (Array.isArray(base1)) {
		if (key === IndexEnd) {
			throw new ApplyPatchesError("Can't replace in the end");
		}
		const index = key as number;
		deleted = base1[index];
		base1.splice(index, 1);
	} else {
		// @ts-expect-error Can't be checked
		deleted = base1[key];
		// @ts-expect-error Can't be checked
		delete base1[key];
	}
	return [base1, deleted];
};

const applyReplace = <T, Assign = unknown>(
	base: T,
	path: Path,
	value: Assign,
	pathIndex = 0,
): T => {
	if (pathIndex >= path.length) {
		return value as never;
	}

	const key = path[pathIndex];
	if (pathIndex + 1 < path.length) {
		return applyShallowAssign(
			base,
			key,
			applyReplace(applyAccess(base, key), path, value, pathIndex + 1),
		);
	}

	const base1 = shallowCopy(base);
	if (base1 instanceof Map) {
		base1.set(key, value);
	} else if (base1 instanceof Set) {
		throw new ApplyPatchesError("Can't replace set element");
	} else if (Array.isArray(base1)) {
		if (key === IndexEnd) {
			throw new ApplyPatchesError("Can't replace in the end");
		}
		base1[key as number] = value;
	} else {
		// @ts-expect-error Can't be checked
		base1[key] = value;
	}
	return base1;
};

const applyAdd = <T, Assign = unknown>(
	base: T,
	path: Path,
	value: Assign,
	pathIndex = 0,
): T => {
	if (pathIndex >= path.length) {
		return value as never;
	}

	const key = path[pathIndex];
	if (pathIndex + 1 < path.length) {
		return applyShallowAssign(
			base,
			key,
			applyAdd(applyAccess(base, key), path, value, pathIndex + 1),
		);
	}

	if (base === undefined || base === null || typeof base !== "object") {
		throw new ApplyPatchesError("Invalid type for add target");
	}
	const base1 = shallowCopy(base);
	if (base1 instanceof Map) {
		base1.set(key, value);
	} else if (base1 instanceof Set) {
		base1.add(value);
	} else if (Array.isArray(base1)) {
		if (key === IndexEnd) {
			base1.push(value);
		} else {
			base1.splice(key as number, 0, value);
		}
	} else {
		// @ts-expect-error Can't be checked
		base1[key] = value;
	}
	return base1;
};

const applyMove = <T>(base: T, entry: PatchMove): T => {
	const [value1, deleted] = applyRemove(base, entry.from);
	return applyAdd<T>(value1, entry.path, deleted as never);
};

const applyCopy = <T>(base: T, entry: PatchCopy): T => {
	const toCopy = applyGet(base, entry.from);
	return applyAdd<T>(base, entry.path, toCopy as never);
};

const applySwap = <T>(base: T, entry: PatchSwap): T => {
	const a = applyGet(base, entry.from);
	const b = applyGet(base, entry.path);
	return applyReplace(applyReplace(base, entry.path, a), entry.from, b);
};

const applyEntry = <T>(value: T, entry: PatchEntry<T>): T => {
	const { op } = entry;
	if (op === PatchOp.Add) {
		return applyAdd(value, entry.path, entry.value);
	} else if (op === PatchOp.Remove) {
		return applyRemove(value, entry.path)[0];
	} else if (op === PatchOp.Replace) {
		return applyReplace(value, entry.path, entry.value);
	}
	throw new ApplyPatchesError("applyEntry: invalid op");
};

const applyPatchEntryBase = <T>(value: T, entry: PatchEntry<T, []>): T => {
	const { op } = entry;
	if (op === PatchOp.Add) {
		if (value === undefined) {
			return entry.value;
		} else {
			throw new ApplyPatchesError("add: cannot add to an non-undefined value");
		}
	} else if (op === PatchOp.Remove) {
		return undefined as T;
	} else if (op === PatchOp.Replace) {
		return entry.value as T;
	}

	throw new ApplyPatchesError(`invalid patchOp: ${op}`);
};

export const applyPatches = <T>(value: T, patches: PatchesExtended<T>): T => {
	if (patches.length === 0) {
		return value;
	}

	let value1: T = value;
	for (const entry of patches) {
		const { op, path } = entry;
		if (path.length === 0) {
			value1 = applyPatchEntryBase(value1, entry as PatchEntry<T, []>);
			continue;
		}

		if (op === PatchOp.Add || op === PatchOp.Remove || op === PatchOp.Replace) {
			value1 = applyEntry(value1, entry);
		} else if (op === PatchOpExtended.Move) {
			value1 = applyMove(value1, entry);
		} else if (op === PatchOpExtended.Copy) {
			value1 = applyCopy(value1, entry);
		} else if (op === PatchOpExtended.Swap) {
			value1 = applySwap(value1, entry);
		} else {
			throw new ApplyPatchesError(`invalid patchOp: ${op}`);
		}
	}

	return value1;
};

export const canApplyPatches = <T>(value: T, patches: Patches) => {
	try {
		applyPatches(value, patches);
		return true;
	} catch (e) {
		if (!e) {
			throw e;
		}
		const message = (e as Error).toString();
		if (
			message.indexOf("Immer") !== -1 ||
			message.indexOf("applyPatches: ") !== -1 ||
			message.indexOf("Attempted to assign to readonly property")
		) {
			return false;
		}

		console.error(value, patches, e);
		throw e;
	}
};
