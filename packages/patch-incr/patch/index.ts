export {
	applyGet,
	ensureObject,
	patchableEntries,
	shallowCopy,
} from "./access";
export { applyPatches, canApplyPatches } from "./apply";
export { ApplyPatchesError } from "./error";
export {
	addPatches,
	combinePatches,
	consPath,
	InvalidPatchEntry,
	isAtomicValue,
	isEmptyPatches,
	isReplaceRoot,
	isReplaceRootEntry,
	liftPatches,
	makeReplaceRootEntry,
	PatchBuilder,
	removePatches,
	replacePatches,
	tryDeconsPath,
	unliftPatchEntry,
	unliftPatches,
} from "./helpers";
export type { ReduceEntry } from "./reduce";
export {
	CannotReduce,
	reducePatches,
	reducePatchesNoOutput,
	reduceReplaceRoot,
} from "./reduce";
export type {
	PatchAdd,
	PatchCopy,
	PatchEntry,
	Patches,
	PatchesExtended,
	PatchMove,
	PatchRemove,
	PatchReplace,
	PatchSwap,
	Path,
	Targeted,
} from "./types";
export { PatchOp, PatchOpExtended } from "./types";
