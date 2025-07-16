import type { Patches, Path } from "../patch";

export type {
	PatchAdd,
	Patches,
	PatchRemove,
	PatchReplace,
	Path,
	Targeted,
} from "../patch";

export { PatchOp } from "../patch";

export type PatchSepElem<T> = { path: Path; patches: Patches<T> };

export type PatchSep<T> = PatchSepElem<T>[];
