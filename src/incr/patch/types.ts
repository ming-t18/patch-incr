import type { HasTypes } from "../typeHelpers";

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
