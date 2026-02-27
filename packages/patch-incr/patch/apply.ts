import { IndexEnd } from "../patchSchema/types";
import { get as _get, applyGet, ensureObject, shallowCopy } from "./access";
import { Applier, hasPatchApplier } from "./applyProtocol";
import { ApplyPatchesError } from "./error";
import {
	NoValue,
	type PatchCopy,
	type PatchEntry,
	type Patches,
	type PatchesExtended,
	type PatchMove,
	PatchOp,
	PatchOpExtended,
	type PatchSwap,
	type Path,
} from "./types";

const _assign = <T, Assign = unknown>(
	base: T,
	key: string | number,
	value: Assign,
	alreadyCopied: WeakSet<WeakKey>,
): T => {
	const copied = shallowCopy(base, alreadyCopied);
	if (copied instanceof Map) {
		copied.set(key, value);
	} else if (copied instanceof Set) {
		throw new ApplyPatchesError("Cannot assign on a set");
	} else if (hasPatchApplier(base)) {
		base[Applier].set(base, key, value);
	} else {
		// @ts-expect-error Can't be checked
		copied[key] = value;
	}
	return copied;
};

const applyRemove = <T, V = unknown, Deleted = unknown>(
	base: T,
	path: Path,
	setValue: V | typeof NoValue,
	alreadyCopied: WeakSet<WeakKey>,
	pathIndex = 0,
): [T, Deleted] => {
	if (pathIndex >= path.length) {
		// @ts-expect-error Assuming T contains undefined
		return [undefined, base];
	}

	const key = path[pathIndex];
	if (pathIndex + 1 < path.length) {
		const [replacement, deleted] = applyRemove(
			_get(base, key),
			path,
			setValue,
			alreadyCopied,
			pathIndex + 1,
		);
		return [_assign(base, key, replacement, alreadyCopied), deleted as Deleted];
	}

	ensureObject(base);
	const base1 = shallowCopy(base, alreadyCopied);
	let deleted: Deleted;
	if (base1 instanceof Map) {
		deleted = base1.get(key);
		base1.delete(key);
	} else if (base1 instanceof Set) {
		if (setValue === NoValue) {
			throw new ApplyPatchesError("Set: Missing value field in remove-patch");
		}
		if (base1.delete(setValue)) {
			deleted = setValue as never;
		} else {
			deleted = undefined as never;
		}
	} else if (Array.isArray(base1)) {
		if (key === IndexEnd) {
			throw new ApplyPatchesError("Can't replace in the end");
		}
		const index = key as number;
		deleted = base1[index];
		base1.splice(index, 1);
	} else if (hasPatchApplier(base1)) {
		deleted = base1[Applier].get(base, key) as never;
		base1[Applier].delete(base, key);
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
	alreadyCopied: WeakSet<WeakKey>,
	pathIndex = 0,
): T => {
	if (pathIndex >= path.length) {
		return value as never;
	}

	const key = path[pathIndex];
	if (pathIndex + 1 < path.length) {
		return _assign(
			base,
			key,
			applyReplace(_get(base, key), path, value, alreadyCopied, pathIndex + 1),
			alreadyCopied,
		);
	}

	ensureObject(base);
	const base1 = shallowCopy(base, alreadyCopied);
	if (base1 instanceof Map) {
		base1.set(key, value);
	} else if (base1 instanceof Set) {
		throw new ApplyPatchesError("Can't replace set element");
	} else if (Array.isArray(base1)) {
		if (key === IndexEnd) {
			throw new ApplyPatchesError("Can't replace in the end");
		}
		base1[key as number] = value;
	} else if (hasPatchApplier(base1)) {
		base1[Applier].set(base, key, value);
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
	alreadyCopied: WeakSet<WeakKey>,
	pathIndex = 0,
): T => {
	if (pathIndex >= path.length) {
		return value as never;
	}

	const key = path[pathIndex];
	if (pathIndex + 1 < path.length) {
		return _assign(
			base,
			key,
			applyAdd(_get(base, key), path, value, alreadyCopied, pathIndex + 1),
			alreadyCopied,
		);
	}

	if (base === undefined || base === null || typeof base !== "object") {
		throw new ApplyPatchesError("Invalid type for add target");
	}
	const base1 = shallowCopy(base, alreadyCopied);
	if (base1 instanceof Map) {
		base1.set(key, value);
	} else if (base1 instanceof Set) {
		// set patch: index ignored
		base1.add(value);
	} else if (Array.isArray(base1)) {
		if (key === IndexEnd) {
			base1.push(value);
		} else {
			base1.splice(key as number, 0, value);
		}
	} else if (hasPatchApplier(base1)) {
		base1[Applier].add(base, key, value);
	} else {
		// @ts-expect-error Can't be checked
		base1[key] = value;
	}
	return base1;
};

const applyMove = <T>(
	base: T,
	entry: PatchMove,
	alreadyCopied: WeakSet<WeakKey>,
): T => {
	const [value1, deleted] = applyRemove(
		base,
		entry.from,
		NoValue,
		alreadyCopied,
	);
	return applyAdd<T>(value1, entry.path, deleted as never, alreadyCopied);
};

const applyCopy = <T>(
	base: T,
	entry: PatchCopy,
	alreadyCopied: WeakSet<WeakKey>,
): T => {
	const toCopy = applyGet(base, entry.from);
	return applyAdd<T>(base, entry.path, toCopy as never, alreadyCopied);
};

const applySwap = <T>(
	base: T,
	entry: PatchSwap,
	alreadyCopied: WeakSet<WeakKey>,
): T => {
	const a = applyGet(base, entry.from);
	const b = applyGet(base, entry.path);
	return applyReplace(
		applyReplace(base, entry.path, a, alreadyCopied),
		entry.from,
		b,
		alreadyCopied,
	);
};

const applyEntry = <T>(
	value: T,
	entry: PatchEntry<T>,
	alreadyCopied: WeakSet<WeakKey>,
): T => {
	const { op } = entry;
	if (op === PatchOp.Add) {
		return applyAdd(value, entry.path, entry.value, alreadyCopied);
	} else if (op === PatchOp.Remove) {
		return applyRemove(value, entry.path, entry.value, alreadyCopied)[0];
	} else if (op === PatchOp.Replace) {
		return applyReplace(value, entry.path, entry.value, alreadyCopied);
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

/**
 * Applies an array of patches to the first argument.
 *
 * This function is designed to be compatible with Immer's `applyPatches` function under `enableMapSet()`.
 *
 * Extensions: `Move`, `Copy` and `Swap` patches, and patching handlers through the `[Apply]` protocl.
 */
export const applyPatches = <T>(
	value: T,
	patches: PatchesExtended<T>,
	alreadyCopiedFromArg?: WeakSet<WeakKey>,
): T => {
	// TODO applyPatches mutable mode (mutable = true)
	if (patches.length === 0) {
		return value;
	}

	const alreadyCopied = alreadyCopiedFromArg ?? new WeakSet();
	let value1: T = value;
	for (const entry of patches) {
		const { op, path } = entry;
		if (path.length === 0) {
			value1 = applyPatchEntryBase(value1, entry as PatchEntry<T, []>);
			continue;
		}

		if (op === PatchOp.Add || op === PatchOp.Remove || op === PatchOp.Replace) {
			value1 = applyEntry(value1, entry, alreadyCopied);
		} else if (op === PatchOpExtended.Move) {
			value1 = applyMove(value1, entry, alreadyCopied);
		} else if (op === PatchOpExtended.Copy) {
			value1 = applyCopy(value1, entry, alreadyCopied);
		} else if (op === PatchOpExtended.Swap) {
			value1 = applySwap(value1, entry, alreadyCopied);
		} else {
			throw new ApplyPatchesError(`invalid patchOp: ${op}`);
		}
	}

	return value1;
};

/** Determines of the patches on the second argument can be successfully applied on the first argument. */
export const canApplyPatches = <T>(value: T, patches: Patches<T>) => {
	try {
		applyPatches(value, patches);
		return true;
	} catch (e) {
		if (e instanceof ApplyPatchesError) {
			return false;
		}

		throw e;
	}
};
