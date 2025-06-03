import { applyPatches as applyPatchesImmer, enablePatches } from "immer";
import { IndexEnd } from "../patchSchema/types";
import type { HasTypes } from "./typeHelpers";
import type { Forward, evaluate } from "./types";
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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface PatchAdd<P extends Path = Path, V = any> {
	op: PatchOp.Add;
	path: P;
	value: V;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface PatchReplace<P extends Path = Path, V = any> {
	op: PatchOp.Replace;
	path: P;
	value: V;
}

export type Targeted<T> = HasTypes<"patchTarget", T>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type PatchEntry<Target = any, P extends Path = Path> = (
	| PatchRemove<P>
	| PatchAdd<P>
	| PatchReplace<P>
) &
	Targeted<Target>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Patches<V = any> = PatchEntry<V>[] & Targeted<V>;

export const isEmptyPatches = (entry: Patches) => {
	return entry.length === 0;
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const removePatch = <V = any>(path = [] as Path): Patches<V> => [
	{
		op: PatchOp.Remove,
		path,
	},
];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const addPatch = <V = any>(value: V, path = [] as Path): Patches<V> => [
	{
		op: PatchOp.Add,
		path,
		value,
	},
];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

export const applyPatches = <T>(value: T, patches: Patches): T => {
	if (patches.length === 0) {
		return value;
	}

	for (const patch of patches) {
		if (patch.path.length === 0 && patch.op === PatchOp.Remove) {
			// deletes key makes value undefined
			return undefined as T;
		}
	}

	if (value !== null && typeof value === "object") {
		return applyPatchesImmer(value, patches);
	}

	let value1: unknown = value;
	for (let i = 0; i < patches.length; i++) {
		// const value0 = value;
		const patch = patches[i];
		if (patch.path.length > 0) {
			if (value1 === null || typeof value1 !== "object") {
				throw new Error(
					`applyPatches: cannot apply non-root patch on atomic value: ${value1}, index=${i}`,
				);
			}
			return applyPatches(value1, patches.slice(i)) as T;
		}

		if (patch.op === PatchOp.Add) {
			throw new Error(
				`applyPatches: cannot add on atomic value: ${value1}, index=${i}`,
			);
		}

		if (patch.op === PatchOp.Replace) {
			value1 = patch.value;
		} else {
			throw new Error(
				`applyPatches: unsupported patch: ${patch.op}, index=${i}`,
			);
		}
	}
	return value1 as T;
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
