export const ReplaceOnly = Symbol.for("ReplaceOnly");

export interface ReplaceOnly<T> {
	readonly [ReplaceOnly]: T;
}

export type DRO<T> = ReplaceOnly<T> | null;
