import { applyPatches as applyPatchesImmer, enablePatches } from "immer";
import { get } from "lodash-es";
import { IndexEnd } from "../patchSchema/types";
import type { HasTypes } from "./typeHelpers";
import type { evaluate, Forward } from "./types";

enablePatches();

export type Path = (number | string)[];

export enum PatchOp {
	Remove = "remove",
	Add = "add",
	Replace = "replace",
}

export interface PatchRemove<P extends Path = Path> {
	op: PatchOp.Remove;
	path: P;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export interface PatchAdd<P extends Path = Path, V = any> {
	op: PatchOp.Add;
	path: P;
	value: V;
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export interface PatchReplace<P extends Path = Path, V = any> {
	op: PatchOp.Replace;
	path: P;
	value: V;
}

export interface PatchMove<P extends Path = Path> {
	op: "move";
	from: P;
	path: P;
}

export interface PatchCopy<P extends Path = Path> {
	op: "copy";
	from: P;
	path: P;
}

export interface PatchSwap<P extends Path = Path> {
	op: "swap";
	from: P;
	path: P;
}

export type Targeted<T> = HasTypes<"patchTarget", T>;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type PatchEntry<Target = any, P extends Path = Path> = (
	| PatchRemove<P>
	| PatchAdd<P>
	| PatchReplace<P>
) &
	Targeted<Target>;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type Patches<V = any> = PatchEntry<V>[] & Targeted<V>;

export const isEmptyPatches = (entry: Patches) => {
	return entry.length === 0;
};

// biome-ignore lint/suspicious/noExplicitAny: intentional
export const removePatch = <V = any>(path = [] as Path): Patches<V> => [
	{
		op: PatchOp.Remove,
		path,
	},
];

// biome-ignore lint/suspicious/noExplicitAny: intentional
export const addPatch = <V = any>(value: V, path = [] as Path): Patches<V> => [
	{
		op: PatchOp.Add,
		path,
		value,
	},
];

// biome-ignore lint/suspicious/noExplicitAny: intentional
export const replacePatch = <V = any>(
	value: V,
	path = [] as Path,
): Patches<V> => [
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

export const isAtomicValue = (value: unknown): boolean =>
	value === null || typeof value !== "object";

export class ApplyPatchesError extends Error {}

const applyPatchEntryBase = <T>(value: T, entry: PatchEntry<T, []>): T => {
	const { op } = entry;
	if (op === PatchOp.Add) {
		if (value === undefined) {
			return entry.value;
		} else {
			throw new ApplyPatchesError("add: cannot add to an non-undefined value");
		}
	} else if (op === PatchOp.Remove) {
		return undefined as T;
	} else if (op === PatchOp.Replace) {
		return entry.value as T;
	}

	throw new ApplyPatchesError(`invalid patchOp: ${op}`);
};

const applyGet = <T, Result>(value: T, path: Path): Result =>
	get(value, path) as Result;

const applyRemove = <T, Deleted = unknown>(
	value: T,
	path: Path,
): [T, Deleted] => {
	const deleted = get(value, path) as Deleted;
	const applied = applyPatchesImmer(value as never, [{ op: "remove", path }]);
	return [applied, deleted];
};

const applyAssign = <T, Assign = unknown>(
	value: T,
	path: Path,
	assignment: Assign,
): T =>
	applyPatchesImmer(value as never, [
		{ op: "replace", path, value: assignment },
	]);

const applyMove = <T>(value: T, entry: PatchMove): T => {
	const [value1, deleted] = applyRemove(value, entry.from);
	return applyAssign<T>(value1, entry.path, deleted as never);
};

const applyCopy = <T>(value: T, entry: PatchCopy): T => {
	const toCopy = applyGet(value, entry.from);
	return applyAssign<T>(value, entry.path, toCopy as never);
};

const applySwap = <T>(value: T, entry: PatchSwap): T => {
	const a = applyGet(value, entry.from);
	const b = applyGet(value, entry.path);
	return applyAssign(applyAssign(value, entry.path, a), entry.from, b);
};

const applyEntry = <T>(value: T, entry: PatchEntry<T>): T =>
	applyPatchesImmer(value as never, [entry]) as T;

export const applyPatches = <T>(value: T, patches: Patches<T>): T => {
	if (patches.length === 0) {
		return value;
	}

	let value1: T = value;
	for (const entry of patches) {
		const { op, path } = entry;
		if (path.length === 0) {
			value1 = applyPatchEntryBase(value1, entry as PatchEntry<T, []>);
			continue;
		}

		if (op === PatchOp.Add || op === PatchOp.Remove || op === PatchOp.Replace) {
			value1 = applyEntry(value1, entry);
		} else if ((op as string) === "move") {
			value1 = applyMove(value1, entry);
		} else if ((op as string) === "copy") {
			value1 = applyCopy(value1, entry);
		} else if ((op as string) === "swap") {
			value1 = applySwap(value1, entry);
		} else {
			throw new ApplyPatchesError(`invalid patchOp: ${op}`);
		}
	}

	return value1;
};

export const canApplyPatches = <T>(value: T, patches: Patches) => {
	try {
		applyPatches(value, patches);
		return true;
	} catch (e) {
		if (!e) {
			throw e;
		}
		const message = (e as Error).toString();
		// console.error('e', message);
		if (
			message.indexOf("Immer") !== -1 ||
			message.indexOf("applyPatches: ") !== -1
		) {
			return false;
		}
		console.error("$here", { message });
		throw e;
	}
};

export const CannotReduce = Symbol.for("CannotReduce");
export type CannotReduce = typeof CannotReduce;

const isReplaceRoot = <T>(
	entry: PatchEntry<T>,
): entry is { op: PatchOp.Replace; value: T; path: [] } => {
	return entry.op === PatchOp.Replace && entry.path.length === 0;
};

/**
 * If the patches contains a replace root, simplify it into the replacement value.
 */
export const reduceReplaceRoot = <T>(
	patches: PatchEntry<T>[],
): { replace: T } | PatchEntry<T>[] => {
	if (patches.length === 0) {
		return patches;
	}

	const hasReplaceRoot = patches.findIndex(isReplaceRoot);
	if (hasReplaceRoot !== -1) {
		const patches1 = patches.slice(hasReplaceRoot);
		// @ts-expect-error selected entry is not Remove
		const initValue: T = patches[hasReplaceRoot].value;
		return { replace: applyPatches(initValue, patches1) };
	}
	return patches;
};

export type ReduceEntry<Input, Output> = (
	input: Input,
	entry: PatchEntry,
	output: Output,
) => Patches | typeof CannotReduce;

export const reducePatches =
	<Input, Output>(
		evaluate: evaluate<Input, Output>,
		reduceEntry: ReduceEntry<Input, Output>,
	): Forward<Input, Output> =>
	(input: Input, patches: Patches, output: Output) => {
		let patches1 = patches;
		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			patches1 = [
				{
					op: PatchOp.Replace,
					path: [],
					value: res.replace,
				},
			] as Patches<Input>;
		}
		return patches1.reduce(
			({ input, patches, output }, entry: PatchEntry) => {
				const res = reduceEntry(input, entry, output);
				const input1 = applyPatches(input, [entry]);
				if (res === CannotReduce) {
					const output1 = evaluate(input1);
					return {
						input: input1,
						patches: [
							{
								op: PatchOp.Replace,
								path: [],
								value: output1,
							},
						],
						output: output1,
					};
				}
				return {
					input: input1,
					patches: [...patches, ...res],
					output: applyPatches(output, res),
				};
			},
			{
				input,
				patches: [] as Patches,
				output,
			},
		).patches;
	};

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

export function ensurePathLeadingNumber<T>(
	entry: PatchEntry<T[], Path>,
): asserts entry is PatchEntry<T[], [number, ...Path]> {
	if (entry.path.length > 0 && typeof entry.path[0] === "number") {
		return;
	}
	throw new InvalidPatchEntry("path must lead with index", entry);
}

/**
 * Normalizes a `PatchEntry` on array to deal with irregular entries:
 * Array index out of bounds or the '-' index.
 * @returns The `PatchEntry` itself or a new instance of normalization is required
 * @throws If the entry is an error.
 */
export const normalizeArrayEntry = <T>(
	xs: unknown[],
	entry: PatchEntry<T[]>,
): PatchEntry<T[], [number, ...Path]> | null => {
	const n = xs.length;
	if (entry.op === PatchOp.Add && entry.path[0] === IndexEnd) {
		return {
			...entry,
			path: [n, ...entry.path.slice(1)],
		};
	}
	ensurePathLeadingNumber(entry);
	const index = entry.path[0];
	if (entry.op === PatchOp.Replace || entry.op === PatchOp.Remove) {
		if (index < 0 || index >= n) {
			return null;
		}
		return entry as never;
	}

	if (entry.op === PatchOp.Add && index > n) {
		return {
			...entry,
			path: [n, ...entry.path.slice(1)],
		};
	}

	return entry as never;
};
