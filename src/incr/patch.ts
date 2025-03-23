import { applyPatches as applyPatchesImmer, enablePatches } from "immer";
import type { HasType } from "typescript";
import type { HasTypes } from "./typeHelpers";
import type { Forward, Invoke } from "./types";
enablePatches();

export type Path = (number | string)[];

export enum PatchOp {
	Remove = "remove",
	Add = "add",
	Replace = "replace",
}

export interface PatchRemove {
	op: PatchOp.Remove;
	path: Path;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface PatchAdd<V = any> {
	op: PatchOp.Add;
	path: Path;
	value: V;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface PatchReplace<V = any> {
	op: PatchOp.Replace;
	path: Path;
	value: V;
}

export type Targeted<T> = HasTypes<"patchTarget", T>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type PatchEntry<Target = any> = (PatchRemove | PatchAdd | PatchReplace) &
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
		try {
			return applyPatchesImmer(value, patches);
		} catch (e) {
			console.error("failed to apply patched through immer", {
				value,
				patches,
			});
			throw e;
		}
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
			// console.error('add', { value: value1, patch });
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
		// console.log({ index: i, value0, value1, patch });
	}
	return value1 as T;
};
export const CannotReduce = Symbol("CannotReduce");

export const reducePatches =
	<Input, Output>(
		invoke: Invoke<Input, Output>,
		reduceEntry: (
			input: Input,
			entry: PatchEntry,
			output: Output,
		) => Patches | typeof CannotReduce,
	): Forward<Input, Output> =>
	(input: Input, patches: Patches, output: Output) =>
		patches.reduce(
			({ input, patches, output }, entry: PatchEntry) => {
				const res = reduceEntry(input, entry, output);
				const input1 = applyPatches(input, [entry]);
				if (res === CannotReduce) {
					const output1 = invoke(input1);
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
