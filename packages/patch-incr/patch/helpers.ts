import type { PatchEntry, Patches, PatchReplace, Path } from "./types";
import { PatchOp } from "./types";

export const isEmptyPatches = (entry: Patches) => {
	return entry.length === 0;
};

export const removePatch = <Target>(path = [] as Path): Patches<Target> => [
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

export const addPatch: AddPatchFunc = <Value, Target>(
	value: Value,
	path = [] as Path,
): Patches<Target> => [
	{
		op: PatchOp.Add,
		path,
		value,
	},
];

export const replacePatch: AddPatchFunc = <Value, Target>(
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
export const liftPatch = <Out>(
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
		throw new Error("unliftPatch: invalid prefix");
	}
	return {
		...rest,
		path: path.slice(1),
	};
};

export const unliftPatch = <Out>(
	prefix: string | number,
	patches: Patches,
): Patches<Out> => patches.map((entry) => unliftPatchEntry(prefix, entry));

export const combinePatches = (a: Patches, b: Patches): Patches => [...a, ...b];

/** Given a `key` and a list of `patches`,
 * returns a new list of patches that only act on `target[key]`
 * derived from the original `patches`,
 * or `null` of the patches affect the root.
 *
 * Opposite of `liftPatch`.
 */
export const projectPatch = <Target>(
	key: string | number,
	patches: Patches,
): Patches<Target> | null => {
	const res = [] as Patches<Target>;
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
