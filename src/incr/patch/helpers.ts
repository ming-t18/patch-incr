import type { PatchEntry, Patches, PatchReplace, Path } from "./types";
import { PatchOp } from "./types";

export const isEmptyPatches = (entry: Patches) => {
	return entry.length === 0;
};

// TODO don't use any
export const removePatch = <Target = any>(
	path = [] as Path,
): Patches<Target> => [
	{
		op: PatchOp.Remove,
		path,
	},
];

// TODO don't use any
export const addPatch = <Value, Target = any>(
	value: Value,
	path = [] as Path,
): Patches<Target> => [
	{
		op: PatchOp.Add,
		path,
		value,
	},
];

// TODO don't use any
export const replacePatch = <Value, Target = any>(
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

export const liftPatch = <Out>(
	prefix: string | number,
	patches: Patches,
): Patches<Out> =>
	patches.map((x) => ({
		...x,
		path: [prefix, ...x.path],
	}));

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

// biome-ignore lint/suspicious/noExplicitAny: intentional
export class PatchBuilder<Target = any> {
	private readonly patches: Patches;

	static empty() {
		return new PatchBuilder([]);
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
