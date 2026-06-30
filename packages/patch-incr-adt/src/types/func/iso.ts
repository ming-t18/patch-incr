import type { AEither } from "@/either";
import type { APair } from "@/pair";
import type { $A } from "@/types/abbr";
import type { IF, IFA } from "./incrFunc";

/** An incremental isomorphism based on `IF`. */
export interface IIso<A extends $A, B extends $A> {
	readonly fwd: IF<A, B>;
	readonly inv: IF<B, A>;
}

/**
 * An incremental isomorphism family based on `IF`.
 * Represents an isomorphism-based lens family.
 */
export interface IIso1<S extends $A, T extends $A, A extends $A, B extends $A> {
	readonly fwd: IF<S, A>;
	readonly inv: IF<B, T>;
}

/** An incremental isomorphism based on `IFA`. */
export interface IIsoA<A extends $A, B extends $A> {
	readonly fwd: IFA<A, B>;
	readonly inv: IFA<B, A>;
}

/**
 * An incremental isomorphism family based on `IFA`.
 * Represents an isomorphism-based lens family.
 */
export interface IIsoA1<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
> {
	readonly fwd: IFA<S, A>;
	readonly inv: IFA<B, T>;
}

export type IIsoLens<S extends $A, A extends $A, R extends $A> = IIso<
	S,
	APair<A, R>
>;

export type IIsoPrism<S extends $A, A extends $A, R extends $A> = IIso<
	S,
	AEither<A, R>
>;

export type IIsoAffine<
	S extends $A,
	A extends $A,
	P extends $A,
	R extends $A,
> = IIso<S, AEither<APair<A, P>, R>>;

export type IIsoLensF<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
> = {
	readonly destruct: IIsoLens<S, A, R>;
	readonly construct: IIsoLens<T, B, R>;
};

export type IIsoPrismF<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
> = {
	readonly destruct: IIsoPrism<S, A, R>;
	readonly construct: IIsoPrism<T, B, R>;
};

export type IIsoAffineF<
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	P extends $A,
	R extends $A,
> = {
	readonly destruct: IIsoAffine<S, A, P, R>;
	readonly construct: IIsoAffine<T, B, P, R>;
};
