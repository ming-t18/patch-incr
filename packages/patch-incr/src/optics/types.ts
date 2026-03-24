import type { AnyIF, IF, InferIFInput } from "@/types";

export enum OpticsKind {
	/** Single result, `T -> A` */
	Lens = "Lens",
	/** Zero or one result, `T -> Option<A>`. Also includes affine traversals. */
	Prism = "Prism",
	/** Any number of results, `T -> A[]` */
	Traversal = "Traversal",
}

export type ISet<T, A> = IF<[T, A], T>;

export type IOver<T, A> = (updater: IF<A, A>) => IF<T, T>;

export type IOverCtx<T, A> = <Ctx>(updater: IF<[A, Ctx], A>) => IF<[T, Ctx], T>;

export interface ISetters<T, A> {
	/** An `IF` to set all of focused values based on the second argument. */
	set: ISet<T, A>;
	/** An `IF` to apply a function on the focused value(s). */
	over: IOver<T, A>;
	/** An `IF` to apply a function on the focused value(s), while passing a context parameter. */
	overCtx: IOverCtx<T, A>;
}

/** An incremental lens focuses on a single value of type `A` inside `T`. */
export interface ILens<T, A, F = never> extends ISetters<T, A> {
	kind: OpticsKind.Lens;
	get: IF<T, A>;
	__family?: F;
}

/** An incremental prism focuses on a single value of type `A` inside `T` if it's present. */
export interface IPrism<T, A, F = never> extends ISetters<T, A> {
	kind: OpticsKind.Prism;
	getOpt: IF<T, [] | [A]>;
	__family?: F;
}

/** An incremental traversal focuses on a zero or more values in a particular order of type `A` inside `T`. */
export interface ITraversal<T, A, F = never> extends ISetters<T, A> {
	kind: OpticsKind.Traversal;
	getMulti: IF<T, A[]>;
	__family?: F;
}

/**
 * Incremental optics.
 * Represented as a tagged union of `ILens | IPrism | ITraversal`.
 * @see `OpticsKind` for more details on each subtype.
 * @see `HasFamilyType` for the third type parameter `F`.
 */
export type IOptics<T, A, F = never> =
	| ILens<T, A, F>
	| IPrism<T, A, F>
	| ITraversal<T, A, F>;

// biome-ignore lint/suspicious/noExplicitAny: needed for type constraints
export type AnyOptics = IOptics<any, any, any>;

export type InferOpticsOut<T extends AnyOptics> = T extends {
	over: (func: infer SF extends AnyIF) => unknown;
}
	? InferIFInput<SF>
	: never;

/**
 * In general, the setter of the optics `IOptics<T, A, F>` accepts `IF<A, A>`.
 * Sometimes we want type-changing setter `IF<A, B>` so the outer
 * type `T` becomes `S`.
 *
 * - Setter (simple): `(f: IF<A, A>) => IF<T, T>`
 * - Setter (type-changing): `(f: IF<A, B>) => IF<T, S>`
 *
 * The family type `F` determines what `S` can be based on `T`.
 *
 * If the family type is `never`, then type changing is not allowed.
 *
 * If the family type resembles a `Path`, then the type `A` at the
 * path can be changed to `B` while maintaining the overall shape
 * of the object. (for example, `Map`s cannot be changed to a path-compatible
 * `Record`)
 *
 * Family types enables the type-changing optics families in Haskell.
 *
 * - Haskell: `Lens s t a b`
 * - TypeScript: `Optics<S, A, F>` can have a setter of `(f: IF<A, B>) => IF<S, T>`
 *   based on what `F` allows `T` to be.
 *
 * ## Example
 * The `Array.all()` optics gets all elements of an array.
 *
 * It has type of Optics<A[], A, [number]>. The family type `[number]`
 * resembles a path, therefore it yields a type-changing setter of
 * `(f: IF<A, B>) => IF<A[], B[]>`
 *
 * In Haskell, the entire optics family is `Lens [a] [b] a b`
 */
export type HasFamilyType<F = unknown> = { __family?: F | undefined };
/** @see `HasFamilyType` */
export type SetFamilyType<T, F> = Omit<T, "__family"> & {
	__family?: F;
};

/** @see `HasFamilyType` */
export type GetFamilyType<T> =
	T extends HasFamilyType<infer F | undefined> ? F : never;

/** @see `HasFamilyType` */
export type ComposeFamily<A, B> = A extends unknown[]
	? B extends unknown[]
		? [...A, ...B]
		: [...A, B]
	: B extends unknown[]
		? [A, ...B]
		: [A, B];
