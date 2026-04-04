import type { IACompose, IAImpls } from "@/arrow";
import type { IAAddReader, IAReader, IATrans } from "@/arrowTransformer";
import type { $1, $2 } from "@/hkt";

export const Reader = "Reader";
/** `Reader : * -> (A -> A)` */
export type Reader = typeof Reader;

export interface ReaderId<T, A, B> {
	reads: false;
	reader: $2<T, A, B>;
}

export interface ReaderRead<T, Ctx, A, B> {
	reads: true;
	reader: $2<T, [A, Ctx], B>;
}

export type ReaderTRepr<Ctx, T, A, B> =
	| ReaderId<T, A, B>
	| ReaderRead<T, Ctx, A, B>;

declare module "@/hkt/app" {
	interface $Map4<T0, T1, T2, T3> {
		readonly [Reader]: ReaderTRepr<T0, T1, T2, T3>;
	}
}

export type ReaderT$<Ctx, T> = $2<Reader, Ctx, T>;
export type R$<Ctx> = $1<Reader, Ctx>;

export interface ImplsArrowReaderInput<T> extends IAImpls<T> {
	compose: IACompose<T>;
}

export interface ImplsArrowReaderOutputBasic<Ctx, T> {
	trans: IATrans<T, $1<Reader, Ctx>>;
	compose: IACompose<ReaderT$<Ctx, T>>;
	add: IAAddReader<Ctx, T, ReaderT$<Ctx, T>>;
}

export interface ImplsArrowReaderOutput<Ctx, T>
	extends ImplsArrowReaderOutputBasic<Ctx, T>,
		IAImpls<$2<Reader, Ctx, T>> {
	reader: IAReader<Ctx, ReaderT$<Ctx, T>>;
}
