import { filter } from "../builder/array";
import type { PatchEntry, Patches, PatchReplace, Path } from "./types";
import { PatchOp } from "./types";

// TODO rename PatchEntry -> Patch

export const isEmptyPatches = (entry: Patches) => {
	return entry.length === 0;
};

export const removePatches = <Target>(path = [] as Path): Patches<Target> => [
	{
		op: PatchOp.Remove,
		path,
	},
];

export interface AddPatchFunc {
	<Value>(value: Value): Patches<Value>;
	<Value>(value: Value, path: []): Patches<Value>;
	<Value, Target>(value: Value, path: Path): Patches<Target>;
}

export const addPatches: AddPatchFunc = <Value, Target>(
	value: Value,
	path = [] as Path,
): Patches<Target> => [
	{
		op: PatchOp.Add,
		path,
		value,
	},
];

export const replacePatches: AddPatchFunc = <Value, Target>(
	value: Value,
	path = [] as Path,
): Patches<Target> => [
	{
		op: PatchOp.Replace,
		path,
		value,
	},
];

export const consPath = (head: string | number, path: Path): Path => [
	head,
	...path,
];

export const tryDeconsPath = (path: Path): [string | number, Path] | null => {
	if (path.length === 0) {
		return null;
	}
	return [path[0], path.slice(1)];
};

/** Given a list of patches for `x`, returns the patches for `{ [key]: x }` */
export const liftPatches = <Out>(
	prefix: string | number | Path,
	patches: Patches,
): Patches<Out> => {
	if (Array.isArray(prefix)) {
		return patches.map((x) => ({
			...x,
			path: [...prefix, ...x.path],
		}));
	}

	return patches.map((x) => ({
		...x,
		path: [prefix, ...x.path],
	}));
};

export const unliftPatchEntry = <Out>(
	prefix: string | number,
	{ path, ...rest }: PatchEntry,
): PatchEntry<Out> => {
	if (path.length === 0 || path[0] !== prefix) {
		throw new Error("unliftPatches: invalid prefix");
	}
	return {
		...rest,
		path: path.slice(1),
	};
};

export const unliftPatches = <Out>(
	prefix: string | number,
	patches: Patches,
): Patches<Out> => patches.map((entry) => unliftPatchEntry(prefix, entry));

export const combinePatches = (a: Patches, b: Patches): Patches => [...a, ...b];

const pathIsPrefix = (a: Path, b: Path) => {
	if (a === b) {
		return true;
	}
	if (a.length > b.length) {
		return false;
	}
	const n = a.length;
	for (let i = 0; i < n; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
};

/**
 * Given patches on an array at a given path,
 * determine the minimum index (or null) where the elements are displaced.
 *
 * Example: An insertion or deletion at index 2 results in a return value of 2,
 * which means all elements after 2 are displaced.
 *
 * ## Property (commute non displaced)
 * Let `p1` be only replace patches on `[...prefix, index]``
 * Let `p2` be patches where `res = analyzeDisplacement(p2, prefix)`
 * If `res === null`, it is treated as infinity instead.
 * Let `p3` be `p2` with patches filtered out on `[...prefix, index1]` where `index1 < res`
 * If all `index` in `p1` are `< res`, then p1 commutes with p3.
 *
 * @param patches the patches to analayze
 * @param prefix the path to the array
 * @returns
 * * `null` if there is no displacement to take into account.
 * * If the is displacement, an integer indicating the min. index (inclusive) that could be
 * affected by displacement.
 * * If the entire array was be replaced, `-1`. This is also considered a displacement.
 */
export const analyzeDisplacement = (
	patches: Patches,
	prefix = [] as Path,
): number | null => {
	const filteredPatches: { op: PatchOp; index: number }[] = [];
	for (const entry of patches) {
		const { path, op } = entry;
		if (path.length <= prefix.length) {
			if (pathIsPrefix(path, prefix)) {
				// obj[[prefix]] is displaced due to parent change
				return -1;
			}
		}
		if (op === PatchOp.Replace) {
			continue;
		}
		if (path.length !== prefix.length + 1) {
			continue;
		}

		if (!pathIsPrefix(prefix, path)) {
			continue;
		}

		const index = path[prefix.length];
		if (typeof index !== "number") {
			continue;
		}
		filteredPatches.push({ op, index });
	}

	let minDisp = null as number | null;
	for (let i = 0; i < filteredPatches.length; i++) {
		const { op, index } = filteredPatches[i];
		if (op === PatchOp.Replace) {
			continue;
		}
		if (minDisp === null) {
			minDisp = index;
		}
		if (index < minDisp) {
			minDisp = index;
		}
	}
	return minDisp;
};

/** Given a `key` and a list of `patches`,
 * returns a new list of patches that only act on `target[key]`
 * derived from the original `patches`,
 * or `null` of the patches affect the root.
 *
 * Opposite of `liftPatches`.
 */
export const projectPatches = <Target>(
	key: string | number,
	patches: Patches,
): Patches<Target> | null => {
	// TODO if key is number perform displacement analysis
	const res = [] as Patches<Target>;
	let minDisp = null;
	if (typeof key === "number") {
		minDisp = analyzeDisplacement(patches, []);
	}
	for (const entry of patches) {
		const { path } = entry;
		if (path.length === 0) {
			return null;
		}
		const [head, ...rest] = path;
		if (minDisp !== null && typeof head === "number" && head >= minDisp) {
			return null;
		}
		if (head === key) {
			res.push({
				...entry,
				path: rest,
			} as PatchEntry<Target>);
		}
	}

	return res;
};

/**
 * The builder pattern for constructing `Patches<Target>`.
 * The methods `add`, `remove`, `replace` appends a `PatchEntry` and
 * mutates the instance itself.
 * The `build()` method returns the built patches.
 *
 * @example
 * ```ts
 * PatchBuilder.empty<T>()
 *   .remove(['array', 0])
 *   .add(['array', '-'], 'test')
 *   .replace('name', 'updated')
 *   .build()
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional
export class PatchBuilder<Target = any> {
	private readonly patches: Patches;

	/**
	 * Creates a new instance of `PatchBuilder`.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: intentional
	static empty<T = any>() {
		return new PatchBuilder<T>([]);
	}

	static from(patches: Patches) {
		return new PatchBuilder(patches);
	}

	private constructor(patches: Patches) {
		this.patches = [...patches];
	}

	remove(path: Path): this {
		this.patches.push({ op: PatchOp.Remove, path });
		return this;
	}

	add(path: Path, value: unknown): this {
		this.patches.push({ op: PatchOp.Add, path, value });
		return this;
	}

	replace(path: Path, value: unknown): this {
		this.patches.push({ op: PatchOp.Replace, path, value });
		return this;
	}

	concat(patches: Patches): this {
		this.patches.push(...patches);
		return this;
	}

	build(): Patches<Target> {
		return this.patches;
	}
}

export const isReplaceRoot = <T>(
	entry: PatchEntry<T>,
): entry is { op: PatchOp.Replace; value: T; path: [] } => {
	return entry.op === PatchOp.Replace && entry.path.length === 0;
};

export const isAtomicValue = (value: unknown): boolean =>
	value === null || typeof value !== "object";

export const isReplaceRootEntry = <T>(
	entry: PatchEntry<T>,
): entry is PatchReplace<[], T> =>
	entry.op === PatchOp.Replace && entry.path.length === 0;

export const makeReplaceRootEntry = <T>(value: T): PatchReplace<[], T> => ({
	op: PatchOp.Replace,
	value,
	path: [] as [],
});

export class InvalidPatchEntry extends Error {
	constructor(
		message: string,
		public readonly patchEntry: PatchEntry,
	) {
		super(
			`${message} op=${patchEntry.op}, path=${patchEntry.path.map(String).join("/")}`,
		);
	}
}
