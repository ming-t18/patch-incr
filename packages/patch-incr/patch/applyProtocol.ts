import type { Patches, Path } from "./types";

export const PatchApplier = Symbol.for("incr-patch-applier");

export interface PatchApplier<T> {
	shallowCopy: (target: T) => T;
	applyGet: (
		recurse: <S>(target1: S, path: Path) => unknown,
		target: T,
		path: Path,
	) => unknown;
	applyPatches: (
		recurse: <S>(target1: S, patches: Patches<S>) => S,
		target: T,
		patches: Patches<T>,
	) => T;
}

export interface HasPatchApplier<T> {
	[PatchApplier]: PatchApplier<T>;
}
