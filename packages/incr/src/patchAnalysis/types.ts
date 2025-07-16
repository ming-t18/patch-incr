import type { Patches, Path } from "../incr/patch";

export type {
	PatchAdd,
	Patches,
	PatchRemove,
	PatchReplace,
	Path,
	Targeted,
} from "../incr/patch";

export { PatchOp } from "../incr/patch";

export type PatchSepElem<T> = { path: Path; patches: Patches<T> };

export type PatchSep<T> = PatchSepElem<T>[];
