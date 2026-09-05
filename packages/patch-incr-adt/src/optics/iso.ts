import type { AEither } from "@/either";
import * as B from "@/funcs/basic";
import { composer } from "@/funcs/compose/chain";
import type { IReader } from "@/funcs/reader";
import { type APair, pair } from "@/pair";
import type { $A } from "@/types";
import type { IIsoFA } from "@/types/func/iso";
import { Either, Pair, Reader } from "../modules";
import { type IAffine, type ILens, type IPrism, OpticsKind } from "./types";

export const wholeLensFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	iso: IIsoFA<S, T, A, B>,
): ILens<S, T, A, B> => {
	const _s: S = iso.fwd.input;
	const _b: B = iso.inv.input;
	const _set0 = B.composeA(
		Pair.snd(pair(iso.fwd.input, iso.inv.input)),
		iso.inv,
	);
	const modify = <Ctx extends $A>(
		func: IReader<Ctx, A, B>,
	): IReader<Ctx, S, T> => {
		const ctx: Ctx = Reader.getTypes(func)[0];
		return Reader.compose(
			Reader.lift(ctx)(iso.fwd),
			Reader.compose(func, Reader.lift(ctx)(iso.inv)),
		);
	};
	return {
		optics: OpticsKind.Lens,
		get: iso.fwd,
		modify,
	};
};

export const lensFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
>(
	iso: IIsoFA<S, T, APair<A, R>, APair<B, R>>,
): ILens<S, T, A, B> => {
	const modify = <Ctx extends $A>(
		func: IReader<Ctx, A, B>,
	): IReader<Ctx, S, T> => {
		const ctx: Ctx = Reader.getTypes(func)[0];
		return Reader.composer(Reader.lift(ctx)(iso.fwd))
			.pipe((t) => Reader.first(t)(func))
			.pipe(Reader.lift(ctx)(iso.inv))
			.build();
	};
	return {
		optics: OpticsKind.Lens,
		get: B.compose(iso.fwd, Pair.fst(iso.fwd.output)),
		modify,
	};
};

export const prismFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
>(
	iso: IIsoFA<S, T, AEither<R, A>, AEither<R, B>>,
): IPrism<S, T, A, B> => {
	const modify = <Ctx extends $A>(
		func: IReader<Ctx, A, B>,
	): IReader<Ctx, S, T> => {
		const ctx: Ctx = Reader.getTypes(func)[0];
		return Reader.composer(Reader.lift(ctx)(iso.fwd))
			.pipe((ra) => Reader.right(ra)(func))
			.pipe(Reader.lift(ctx)(iso.inv))
			.build();
	};
	return {
		optics: OpticsKind.Prism,
		getOpt: B.compose(iso.fwd, Either.rightToOption(iso.fwd.output)),
		review: B.compose(Either.introRight(iso.inv.input), iso.inv),
		modify,
	};
};

export const affineFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
	P extends $A,
>(
	iso: IIsoFA<S, T, AEither<R, APair<A, P>>, AEither<R, APair<B, P>>>,
): IAffine<S, T, A, B> => {
	const modify = <Ctx extends $A>(
		func: IReader<Ctx, A, B>,
	): IReader<Ctx, S, T> => {
		const ctx: Ctx = Reader.getTypes(func)[0];
		return Reader.composer(Reader.lift(ctx)(iso.fwd))
			.pipe((rap) =>
				Reader.right(rap)(Reader.first(rap.shape.right.inner)(func)),
			)
			.pipe(Reader.lift(ctx)(iso.inv))
			.build();
	};
	return {
		optics: OpticsKind.Affine,
		getOpt: composer(iso.fwd)
			.pipe((t) =>
				// Required to preserve IFA subtype (left/right don't track subtypes correctly in sig)
				Either.leftRightA(t)(
					B.identity(t.shape.left.inner),
					Pair.fst(t.shape.right.inner),
				),
			)
			.pipe((t) => Either.rightToOption(t))
			// TODO create Option.map helper
			// .pipe((t) => Option.map(Pair.fst(t.shape.some.shape.value)))
			.build(),
		modify,
	};
};
