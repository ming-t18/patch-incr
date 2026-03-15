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

export const pathIsPrefix = (shorter: Path, longer: Path) => {
	const a = shorter;
	const b = longer;
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
 * Given patches on an array,
 * determine the minimum index (or null) where the elements are displaced.
 *
 * @returns `-1` if the entire array is replaced. `null` if no affected
 * indexes. Otherwise the lowest index of displaced elements.
 */
export const analyzeDisplacement = (patches: Patches): number | null => {
	const filteredPatches: { op: PatchOp; index: number }[] = [];
	for (const entry of patches) {
		const { path, op } = entry;
		if (path.length === 0) {
			return -1;
		}

		if (op === PatchOp.Replace) {
			continue;
		}

		const index = path[0];
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

export const projectPatchesSingle = <Target>(
	key: string | number,
	patches: Patches,
): Patches<Target> | null => {
	const res = [] as Patches<Target>;
	let minDisp = null;
	if (typeof key === "number") {
		minDisp = analyzeDisplacement(patches);
		if (minDisp !== null && key >= minDisp) {
			return null;
		}
	}
	for (const entry of patches) {
		const { path } = entry;
		if (path.length === 0) {
			return null;
		}
		const [head, ...rest] = path;
		if (head === key) {
			res.push({
				...entry,
				path: rest,
			} as PatchEntry<Target>);
		}
	}

	return res;
};

export const antiProjectPatchesSingle = <Target>(
	key: string | number,
	patches: Patches,
): Patches<Target> | null => {
	const res = [] as Patches<Target>;
	let minDisp = null;
	if (typeof key === "number") {
		minDisp = analyzeDisplacement(patches);
		if (minDisp !== null && key >= minDisp) {
			return null;
		}
	}

	for (const entry of patches) {
		const { path } = entry;
		if (path.length === 0) {
			return null;
		}
		const [head] = path;
		if (head !== key) {
			res.push({
				...entry,
			} as PatchEntry<Target>);
		}
	}

	return res;
};

const _cannotProjectHelper = (prefix: Path, entry: PatchEntry) => {
	const { path } = entry;
	if (path.length === 0) {
		// root is replaced, return null due to displacement
		return true;
	}

	if (path.length <= prefix.length) {
		const last = path[path.length - 1];
		if (typeof last === "number") {
			const i: number = last;
			const j = prefix[path.length - 1];
			const before: Path = path.slice(0, path.length - 1);
			if (pathIsPrefix(before, prefix) && typeof j === "number") {
				if (path.length === prefix.length) {
					// path = [...before, i]
					// prefix = [...before, j]
					const { op } = entry;
					if (i <= j && op !== PatchOp.Replace) {
						return true;
					}
				} else if (i <= j) {
					// path = [...before, i]
					// prefix = [...before, j, ...after]
					// a parent of root is displaced
					return true;
				}
			}
		}
	}

	if (pathIsPrefix(path, prefix)) {
		// prefix = [...path, ...extras]
		return true;
	}

	return false;
};

export const projectPatchesMulti = <Target, Root = unknown>(
	prefix: Path,
	patches: Patches<Root>,
): Patches<Target> | null => {
	if (prefix.length === 0 || patches.length === 0) {
		return [];
	}

	const n = prefix.length;
	const results: Patches<Target> = [];
	for (const entry of patches) {
		if (_cannotProjectHelper(prefix, entry)) {
			return null;
		}

		const { path } = entry;
		if (!pathIsPrefix(prefix, path)) {
			continue;
		}

		// path = [...prefix, ...extras]
		results.push({
			...entry,
			path: entry.path.slice(n),
		} as PatchEntry<Target>);
	}

	return results;
};

export const antiProjectPatchesMulti = <Root = unknown>(
	prefix: Path,
	patches: Patches<Root>,
): Patches<Root> | null => {
	if (prefix.length === 0 || patches.length === 0) {
		return [];
	}

	const results: Patches<Root> = [];
	for (const entry of patches) {
		if (_cannotProjectHelper(prefix, entry)) {
			return null;
		}

		const { path } = entry;
		if (pathIsPrefix(prefix, path)) {
			continue;
		}

		results.push(entry);
	}

	return results;
};

/**
 * Given a `prefix` (key or path) and a list of `patches`,
 * returns a new list of patches that only act on `target[key]`
 * derived from the original `patches`,
 * or `null` if not possible.
 *
 * Opposite of `liftPatches`.
 *
 * ## Property (see test/helpers.test.ts)
 * Given `projected = projectPatches(prefix, patches)` and `projected !== null`:
 *
 * `value[[prefix]] @ projected = (value @ patches)[[prefix]]`
 */
export const projectPatches = <Target>(
	key: string | number | Path,
	patches: Patches,
): Patches<Target> | null => {
	if (Array.isArray(key)) {
		return projectPatchesMulti(key, patches);
	}
	return projectPatchesSingle(key, patches);
};

/**
 * The complement of `projectPatches`.
 *
 * Given `Patches<Target>`, determine the subset of patches
 * that does not affect the particular path.
 *
 * Returns `null` if `projectPatches` on the samne arguments would return `null`.
 *
 * ## Properties
 *
 * Let `p = projectPatches(path, patches), q = antiProjectPatches(path, patches)`
 *
 * 1. Nullness: `p === null` if and only if `q === null`
 *
 * 2. Partition: `p` and `liftPatches(path, q)` are partitions of `patches` in their original orders
 *
 * 3. Commutative: `p` and `liftPatches(path, q)` are disjoint and commute.
 */
export const antiProjectPatches = <Root = unknown>(
	key: string | number | Path,
	patches: Patches<Root>,
): Patches<Root> | null => {
	if (Array.isArray(key)) {
		return antiProjectPatchesMulti(key, patches);
	}
	return antiProjectPatchesSingle(key, patches);
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

	remove(path: Path, value = undefined as unknown): this {
		if (value === undefined) {
			this.patches.push({ op: PatchOp.Remove, path });
		} else {
			this.patches.push({ op: PatchOp.Remove, path, value });
		}
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

export const pathEquals = (a: Path, b: Path): boolean => {
	if (a === b) {
		return true;
	}
	if (a.length !== b.length) {
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
