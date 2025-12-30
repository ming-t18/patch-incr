import type { Patches, Path } from "./types";

export const Applier = Symbol.for("patch-incr/Applier");

/**
 * Interface for performing `applyPatches`-related operations.
 *
 * The patch operations returning `void` are *mutating* on the
 * target itself.
 * The default behavior of `applyPatches` is to call
 * `shallowCopy` on the target then mutate the copied version.
 *
 * Most of the operations are designed to be similar to
 * the `Map` operations.
 *
 * The `applyGet` and `applyPatches` consumes the entire path,
 * instead of one key at a time, and they are applied if present.
 */
export interface PatchApplier<T, Key = unknown> {
	shallowCopy: (target: T) => T;
	keys: (target: T) => Key[];

	get: (target: T, key: Key) => unknown;
	add: (target: T, key: Key, value: unknown) => void;
	set: (target: T, key: Key, value: unknown) => boolean;
	has: (target: T, key: Key) => boolean;
	delete: (target: T, key: Key) => boolean;

	entries?: (target: T) => [Key, unknown][];
	numKeys?: (target: T) => number;

	applyGet?: (
		recurse: <S>(target1: S, path: Path) => unknown,
		target: T,
		path: Path,
	) => unknown;
	applyPatches?: (
		recurse: <S>(target1: S, patches: Patches<S>) => S,
		target: T,
		patches: Patches<T>,
	) => T;
}

export interface HasPatchApplier<T, Key = unknown> {
	[Applier]: PatchApplier<T, Key>;
}

export const defaultEntries = <T, Key = unknown>(
	{ keys, get }: Pick<PatchApplier<T, Key>, "keys" | "get">,
	target: T,
) => keys(target).map((key: Key) => get(target, key));

export const defaultNumKeys = <T, Key = unknown>(
	{ keys, get }: Pick<PatchApplier<T, Key>, "keys" | "get">,
	target: T,
) => keys(target).map((key: Key) => get(target, key));

export function hasPatchApplier<T = unknown, Key = unknown>(
	value: unknown,
): value is HasPatchApplier<T, Key> {
	return value !== null && typeof value === "object" && Applier in value;
}

export const getPatchApplier = <T = unknown, Key = unknown>(
	value: T,
): PatchApplier<T, Key> | null => {
	if (value !== null && typeof value === "object" && Applier in value) {
		return value[Applier] as never;
	}
	return null;
};
