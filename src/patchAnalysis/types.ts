import type {
	PatchAdd,
	PatchRemove,
	PatchReplace,
	Patches,
	Path,
	Targeted,
} from "../incr/patch";
import { PatchOp } from "../incr/patch";

export type {
	Path,
	PatchAdd,
	PatchRemove,
	PatchReplace,
	Targeted,
	Patches,
} from "../incr/patch";

export { PatchOp } from "../incr/patch";

export type PatchSepElem<T> = { path: Path; patches: Patches<T> };

export type PatchSep<T> = PatchSepElem<T>[];
