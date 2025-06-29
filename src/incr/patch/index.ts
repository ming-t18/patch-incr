export { applyPatches, canApplyPatches } from "./apply";
export {
	addPatch,
	combinePatches,
	consPath,
	InvalidPatchEntry,
	isAtomicValue,
	isEmptyPatches,
	isReplaceRoot,
	isReplaceRootEntry,
	liftPatch,
	makeReplaceRootEntry,
	PatchBuilder,
	removePatch,
	replacePatch,
	tryDeconsPath,
	unliftPatch,
	unliftPatchEntry,
} from "./helpers";
export type { ReduceEntry } from "./reduce";
export { CannotReduce, reducePatches, reduceReplaceRoot } from "./reduce";
export type {
	PatchAdd,
	PatchCopy,
	PatchEntry,
	Patches,
	PatchMove,
	PatchRemove,
	PatchReplace,
	PatchSwap,
	Path,
	Targeted,
} from "./types";
export { PatchOp } from "./types";
