import type { AOption } from "@/option";
import type { APair } from "@/pair";
import type { $A } from "../abbr";
import type { IF, IFA, IFC } from "./incrFunc";

export interface ISet<S extends $A, A extends $A> {
	readonly set: IF<APair<S, A>, S>;
	readonly modify: (func: IF<A, A>) => IF<S, S>;
	readonly modifyCtx: <Ctx extends $A>(func: IFC<Ctx, A, A>) => IFC<Ctx, S, S>;
}

export interface ISet1<S extends $A, T extends $A, A extends $A, B extends $A> {
	readonly set: IF<APair<S, B>, T>;
	readonly modify: (func: IF<A, B>) => IF<S, T>;
	readonly modifyCtx: <Ctx extends $A>(func: IFC<Ctx, A, B>) => IFC<Ctx, S, T>;
}

export interface ILens<S extends $A, A extends $A> extends ISet<S, A> {
	readonly get: IFA<S, A>;
}

export interface ILens1<S extends $A, T extends $A, A extends $A, B extends $A>
	extends ISet1<S, T, A, B> {
	readonly get: IFA<S, A>;
}

export interface IAffine<S extends $A, A extends $A> extends ISet<S, A> {
	readonly view: IFA<S, AOption<A>>;
}

export interface IAffine1<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
> extends ISet1<S, T, A, B> {
	readonly view: IFA<S, AOption<A>>;
}

export interface IPrism<S extends $A, A extends $A> extends IAffine<S, A> {
	readonly review: IFA<A, S>;
}

export interface IPrism1<S extends $A, T extends $A, A extends $A, B extends $A>
	extends IAffine1<S, T, A, B> {
	readonly review: IFA<B, T>;
}
