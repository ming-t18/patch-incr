import type { Patches, Path } from "patch-incr/patch";

export enum RefTag {
	Copy = "copy",
	Move = "move",
	Swap = "swap",
}

/** Root object to keep track of the changes on a draft. */
export interface Root<T> {
	/** True if and only if revoked. */
	_finished: boolean;
	/** Original value. */
	readonly _orig: T;
	/** Current value. Is reassigned when updated. */
	_curr?: T;
	/* Collector for the cumulative patches, updated in-place. */
	readonly _patches: Patches<T>;
	/** Keep track of the current value? */
	readonly _track?: boolean;
	/** Set of objects to avoid shallow copying due to sole ownership of this `Root`. */
	readonly _alreadyCopied: WeakSet<WeakKey>;
}

export interface HasCurrent<T> extends Root<T> {
	readonly _track: true;
	_curr: T;
}

export interface Ref<T, IsTracked extends boolean = boolean> {
	readonly _root: IsTracked extends true ? HasCurrent<T> : Root<T>;
	readonly _path: Path;
	/** Tag for a copy/move/swap operation */
	readonly _tag?: RefTag;
}

/**
 * The return value of a method handler, which can be
 * a reference to a particular element by path, or
 * a new value.
 */
export type HandlerReturn = { value: unknown } | { path: Path };

export interface HandlerSpec<T> {
	mutating: boolean;
	numArgs?: undefined | number | { min: number; max?: number };
	handler: (target: Ref<T>, prefix: Path, args: unknown[]) => HandlerReturn;
}

export type HandlerSpecMap<T> = Record<string, HandlerSpec<T>>;

/**
 * Contains handlers for collection methods such as `push` and `pop` for arrays.
 */
export interface MethodHandlers<T> {
	handlers: HandlerSpecMap<T>;
	original: Set<string>;
}

export interface CreateDraftOptions {
	track?: boolean;
}
