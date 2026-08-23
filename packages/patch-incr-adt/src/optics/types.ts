import type { AArray } from "@/array";
import type { IReader } from "@/funcs/reader";
import type { Ijq } from "@/ijq";
import type { AOptional } from "@/optional";
import type { APair } from "@/pair";
import type { $A, IF, IFA } from "@/types";

export enum OpticsKind {
	Lens = "Lens",
	Prism = "Prism",
	Affine = "Affine",
	Traversal = "Traversal",
}

export interface ISetter<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
> {
	/** Given input `S`, replaces its focus from context `B` and returns the modified input `T`. */
	set: IReader<B, S, T>;

	/** Like `set`, except without the `IReader` wrapper. */
	set0: IF<APair<S, B>, T>;

	/**
	 * Given a modifier function of `IReader`, `A -> B`,
	 * returns an `IReader` from `S -> T` where the focus `A` is modified to `B`.
	 *
	 * @param func The reader arrow to run on the focus
	 * @param Ctx The context type of the reader
	 * @see `modify0, modifyC` for counterparts without `IReader`
	 */
	modify: <Ctx extends $A>(func: IReader<Ctx, A, B>) => IReader<Ctx, S, T>;

	/** Like `modify`, except the `Reader` wapper is not needed. */
	modify0: (func: IF<A, B>) => IF<S, T>;

	/** Like `modify`, except without the `IReader` wrapper. */
	modifyC: <Ctx extends $A>(func: IF<APair<A, Ctx>, B>) => IF<APair<S, Ctx>, T>;
}

/** `S ~= exists R. (A * R)` */
export interface ILens<S extends $A, T extends $A, A extends $A, B extends $A>
	extends ISetter<S, T, A, B> {
	optics: OpticsKind.Lens;
	get: IFA<S, A>;
}

/** `S ~= exists B R. (R + (A * B))` */
export interface IAffine<S extends $A, T extends $A, A extends $A, B extends $A>
	extends ISetter<S, T, A, B> {
	optics: OpticsKind.Affine;
	getOpt: IFA<S, AOptional<A>>;
}

/** `S ~= exists R. (R + A)` */
export interface IPrism<S extends $A, T extends $A, A extends $A, B extends $A>
	extends ISetter<S, T, A, B> {
	optics: OpticsKind.Prism;
	getOpt: IFA<S, AOptional<A>>;
	review: IF<B, T>;
}
/** `S ~= exists R. (A[] * R)` */
export interface ITraversal<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
> extends ISetter<S, T, A, B> {
	optics: OpticsKind.Traversal;
	traverse: IFA<S, AArray<A>>;
	review: IF<B, T>;
}

export type ISetter0<S extends $A, A extends $A> = ISetter<S, S, A, A>;
export type ILens0<S extends $A, A extends $A> = ILens<S, S, A, A>;

export interface IjqSetter<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
> {
	modify: <Ctx extends $A>(func: Ijq<Ctx, A, B>) => Ijq<Ctx, S, T>;
}

export interface IjqOptics<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
> extends IjqSetter<S, T, A, B> {
	get: <Ctx extends $A>(ctx: Ctx) => Ijq<Ctx, S, A>;
}

export type IjqOptics0<S extends $A, A extends $A> = IjqOptics<S, S, A, A>;
export type IjqSetter0<S extends $A, A extends $A> = IjqSetter<S, S, A, A>;
