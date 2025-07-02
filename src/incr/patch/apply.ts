import { applyPatches as applyPatchesImmer, enablePatches } from "immer";
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

enablePatches();

export class ApplyPatchesError extends Error {}

export const applyGet = <T, Result = unknown>(value: T, path: Path): Result => {
	let value1: unknown = value;
	for (let i = 0; i < path.length; i++) {
		const k = path[i];
		// @ts-expect-error Can't be checked
		value1 = value1 instanceof Map ? value1.get(k) : value1[k];
	}
	return value1 as never;
};

const applyRemove = <T, Deleted = unknown>(
	base: T,
	path: Path,
): [T, Deleted] => {
	const deleted = applyGet(base, path) as Deleted;
	const applied = applyPatchesImmer(base as never, [{ op: "remove", path }]);
	return [applied, deleted];
};

const applyReplace = <T, Assign = unknown>(
	base: T,
	path: Path,
	value: Assign,
): T => applyPatchesImmer(base as never, [{ op: "replace", path, value }]);

const applyAdd = <T, Assign = unknown>(base: T, path: Path, value: Assign): T =>
	applyPatchesImmer(base as never, [{ op: "add", path, value }]);

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

const applyEntry = <T>(value: T, entry: PatchEntry<T>): T =>
	applyPatchesImmer(value as never, [entry]) as T;

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
