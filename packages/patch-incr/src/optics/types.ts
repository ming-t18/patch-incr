import type { AnyIF, IF, InferIFInput } from "@/types";

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
export interface ILens<T, A, F = never> {
	kind: OpticsKind.Lens;
	get: IF<T, A>;
	set: ISetter<T, A>;
	__family?: F;
}

/** An incremental prism focuses on a single value of type `A` inside `T` if it's present. */
export interface IPrism<T, A, F = never> {
	kind: OpticsKind.Prism;
	getOpt: IF<T, [] | [A]>;
	set: ISetter<T, A>;
	__family?: F;
}

/** An incremental traversal focuses on a zero or more values in a particular order of type `A` inside `T`. */
export interface ITraversal<T, A, F = never> {
	kind: OpticsKind.Traversal;
	getMulti: IF<T, A[]>;
	set: ISetter<T, A>;
	__family?: F;
}

/** Incremental optics. Represented as a tagged union of `ILens | IPrism | ITraversal`. */
export type IOptics<T, A, F = never> =
	| ILens<T, A, F>
	| IPrism<T, A, F>
	| ITraversal<T, A, F>;

// biome-ignore lint/suspicious/noExplicitAny: needed for type constraints
export type AnyOptics = IOptics<any, any, any>;

export type InferOpticsOut<T extends AnyOptics> = T extends {
	set: (func: infer SF extends AnyIF) => unknown;
}
	? InferIFInput<SF>
	: never;

export type HasFamilyType<F = unknown> = { __family?: F | undefined };
export type SetFamilyType<T, F> = Omit<T, "__family"> & {
	__family?: F;
};

export type GetFamilyType<T> =
	T extends HasFamilyType<infer F | undefined> ? F : never;
export type ComposeFamily<A, B> = A extends unknown[]
	? B extends unknown[]
		? [...A, ...B]
		: [A, B]
	: [A, B];
