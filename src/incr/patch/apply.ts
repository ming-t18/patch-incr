import { applyPatches as applyPatchesImmer, enablePatches } from "immer";
import get from "lodash-es/get";
import type {
	PatchCopy,
	PatchEntry,
	Patches,
	PatchMove,
	PatchSwap,
	Path,
} from "./types";
import { PatchOp } from "./types";

enablePatches();

export class ApplyPatchesError extends Error {}

const applyGet = <T, Result>(value: T, path: Path): Result =>
	get(value, path) as Result;

const applyRemove = <T, Deleted = unknown>(
	value: T,
	path: Path,
): [T, Deleted] => {
	const deleted = get(value, path) as Deleted;
	const applied = applyPatchesImmer(value as never, [{ op: "remove", path }]);
	return [applied, deleted];
};

const applyAssign = <T, Assign = unknown>(
	value: T,
	path: Path,
	assignment: Assign,
): T =>
	applyPatchesImmer(value as never, [
		{ op: "replace", path, value: assignment },
	]);

const applyMove = <T>(value: T, entry: PatchMove): T => {
	const [value1, deleted] = applyRemove(value, entry.from);
	return applyAssign<T>(value1, entry.path, deleted as never);
};

const applyCopy = <T>(value: T, entry: PatchCopy): T => {
	const toCopy = applyGet(value, entry.from);
	return applyAssign<T>(value, entry.path, toCopy as never);
};

const applySwap = <T>(value: T, entry: PatchSwap): T => {
	const a = applyGet(value, entry.from);
	const b = applyGet(value, entry.path);
	return applyAssign(applyAssign(value, entry.path, a), entry.from, b);
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

export const applyPatches = <T>(value: T, patches: Patches<T>): T => {
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
		} else if ((op as string) === "move") {
			value1 = applyMove(value1, entry);
		} else if ((op as string) === "copy") {
			value1 = applyCopy(value1, entry);
		} else if ((op as string) === "swap") {
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
		// console.error('e', message);
		if (
			message.indexOf("Immer") !== -1 ||
			message.indexOf("applyPatches: ") !== -1
		) {
			return false;
		}
		console.error("$here", { message });
		throw e;
	}
};
