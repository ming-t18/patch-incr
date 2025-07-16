/**
 *
 * Patches are represented through a variant of JSON patches designed to work
 * together with the output of Immer `produceWithPatches`,
 * including `Map` and `Set` support.
 *
 * # The patch type
 * Patches are represented by `Patches<T>` where `T` is an
 * optional generic parameter corresponding to the patch target type.
 *
 * `Patches<T>` are arrays of `PatchEntry<T>`. A `PatchEntry<T>` is a type alias
 * for sub-type of patch entries:
 *  - `PatchAdd`
 *  - `PatchRemove`
 *  - `PatchReplace`
 *
 * ## Extended patches
 *
 * Extend patches contain patch operations not supported by Immer: copy, move and swap.
 *
 * Type type for extended patches is `PatchesExtended<T>`, which contains entries of
 * `PatchEntryExtended<T>`. The additional patch entries are:
 *  - `PatchCopy`
 *  - `PatchMove`
 *  - `PatchSwap`
 *
 * ## Compatibility
 *
 * Departures from how Immer handles patches are:
 *  - Doing `remove` on root sets the root to undefined
 *  - `copy`, `move` and `swap` are supported
 *
 * Departures from JSON patches are:
 *  - The `test` operation is not supported
 *  - Pure string paths are not supported
 *  - There is a `swap` operation that behaves like two simultaneous `move` operations
 *
 * # Applying patches
 *
 * The `applyPatches` function returns a new value with the patches applied.
 * The `applyGet` function performs path access on a value, and that is how
 * `applyPatches` handles path access.
 *
 * @module
 */

export { applyGet, applyPatches, canApplyPatches } from "./apply";
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
