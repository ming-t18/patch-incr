import type { IF } from "@/types";

export enum OpticsKind {
	/** Single result, `T -> A` */
	Lens = "Lens",
	/** Zero or one result, `T -> Option<A>`. */
	Prism = "Prism",
	/** Any number of results, `T -> A[]` */
	Traversal = "Traversal",
}

/**
 * An incremental optics setter. It is a functional that converts an `IF` on the focused type `A`
 * to an `IF` on the all focused values of `T`.
 *
 * ## Properties
 *  - identity: `l.set(identity()) === identity()`
 *  - compose: `l.set(f) >>> l.set(g) === l.set(f >>> g)`
 */
export type ISetter<T, A> = (updater: IF<A, A>) => IF<T, T>;

/** An incremental lens focuses on a single value of type `A` inside `T`. */
export interface ILens<T, A> {
	kind: OpticsKind.Lens;
	get: IF<T, A>;
	set: ISetter<T, A>;
}

/** An incremental prism focuses on a single value of type `A` inside `T` if it's present. */
export interface IPrism<T, A> {
	kind: OpticsKind.Prism;
	getOpt: IF<T, [] | [A]>;
	set: ISetter<T, A>;
}

/** An incremental traversal focuses on a zero or more values in a particular order of type `A` inside `T`. */
export interface ITraversal<T, A> {
	kind: OpticsKind.Traversal;
	getMulti: IF<T, A[]>;
	set: ISetter<T, A>;
}

/** Incremental optics. Represented as a tagged union of `ILens | IPrism | ITraversal`. */
export type IOptics<T, A> = ILens<T, A> | IPrism<T, A> | ITraversal<T, A>;
