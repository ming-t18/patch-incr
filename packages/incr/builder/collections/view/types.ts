import type { Patches } from "../../../patch";

export type ListSplit<N, T> = { left: N; middle: T; right: N } | null;

export interface ListView<N, T> {
	length(node: N): number;
	analyze(node: N): ListSplit<N, T>;
	readonly empty: N;

	create(split: ListSplit<N, T>): N;
	split(node: N): [ListSplit<N, T>, ListSplit<N, T>];
	getIndex: (node: N, index: number) => T;
	setIndex: (node: N, index: number, value: T) => void;

	applyPatches(node: N, patches: Patches<T[]>): N;
}
