import { applyPatches as applyPatchesImmer, enablePatches } from "immer";
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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type PatchEntry<V = any> = PatchRemove | PatchAdd<V> | PatchReplace<V>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Patches<V = any> = PatchEntry<V>[];

export interface ForwardElement<Input, Output> {
	remove(patch: PatchRemove, input: Input, output: Output): Patches | null;
	add(patch: PatchAdd, input: Input, output: Output): Patches | null;
	replace(patch: PatchReplace, input: Input, output: Output): Patches | null;
}

export const isEmptyPatches = (entry: Patches) => {
	return entry.length === 0;
};

export const removePatch = (path = [] as Path): Patches => [
	{
		op: PatchOp.Remove,
		path,
	},
];

export const addPatch = <V>(value: V, path = [] as Path): Patches => [
	{
		op: PatchOp.Add,
		path,
		value,
	},
];

export const replacePatch = <V>(value: V, path = [] as Path): Patches => [
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

export const liftPatch = (prefix: string | number, patches: Patches): Patches =>
	patches.map((x) => ({
		...x,
		path: [prefix, ...x.path],
	}));

export const combinePatches = (a: Patches, b: Patches): Patches => [...a, ...b];

export class PatchBuilder {
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

	build() {
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
		if (patch.op === PatchOp.Remove) {
			throw new Error("applyPatches: cannot remove root");
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
				// console.error("non-root on atomic", { value: value1, patch });
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

export const forwardFromElements = <Input, Output>(
	handler: ForwardElement<Input, Output>,
	invoke?: Invoke<Input, Output>,
): Forward<Input, Output> => {
	return (input0, change, output0) => {
		let input = input0;
		let output = output0;
		const patches: Patches = [];
		for (const patch of change) {
			let outChange: Patches = [];
			if (
				patch.op === PatchOp.Remove ||
				patch.op === PatchOp.Add ||
				patch.op === PatchOp.Replace
			) {
				const res = handler[patch.op](patch as never, input, output);
				if (res === null) {
					// bail out: use replace instead
					const inputEnd = applyPatches(input0, change);
					if (!invoke) {
						throw new Error("need to use invoke but is absent");
					}
					return replacePatch(invoke(inputEnd));
				}
				outChange = res;
			} else {
				// @ts-expect-error patch.op should have type never
				throw new Error(`Unsupported patch: ${patch.op}`);
			}

			input = applyPatches(input, [patch]);
			output = applyPatches(output, outChange);
			patches.push(...outChange);
		}
		return patches;
	};
};
