import type { AEither } from "@/either";
import * as B from "@/funcs/basic";
import { composer } from "@/funcs/compose/chain";
import type { IReader } from "@/funcs/reader";
import { type APair, pair } from "@/pair";
import { abc_cba } from "@/product/perm";
import type { $A, IF } from "@/types";
import type { IIsoFA } from "@/types/func/iso";
import { Pair, Reader } from "../modules";
import { type ILens, type IPrism, OpticsKind } from "./types";

export const wholeLensFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	iso: IIsoFA<S, T, A, B>,
): ILens<S, T, A, B> => {
	const s: S = iso.fwd.input;
	const b: B = iso.inv.input;
	const set0 = B.composeA(
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
		set: Reader.compose(Reader.ask(b)(s), Reader.lift(b)(iso.inv)),
		set0,
		modify,
		modify0: (func: IF<A, B>): IF<S, T> =>
			composer(iso.fwd)
				.pipe(() => func)
				.pipe(() => iso.inv)
				.build(),
		modifyC: <Ctx extends $A>(
			func: IF<APair<A, Ctx>, B>,
		): IF<APair<S, Ctx>, T> =>
			Reader.toUsesCtx(modify(Reader.fromReader(func))).func,
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
	const s: S = iso.fwd.input;
	const b: B = iso.inv.input.shape[0];
	const [_b, r] = iso.inv.input.shape;
	const modify = <Ctx extends $A>(
		func: IReader<Ctx, A, B>,
	): IReader<Ctx, S, T> => {
		const ctx: Ctx = Reader.getTypes(func)[0];
		return Reader.composer(Reader.lift(ctx)(iso.fwd))
			.pipe(Reader.first(r)(func))
			.pipe(Reader.lift(ctx)(iso.inv))
			.build();
	};

	const sb = pair(s, b);
	const set0: IF<APair<S, B>, T> = composer(Pair.first(sb)(iso.fwd))
		.pipe(abc_cba)
		.pipe(Pair.fst)
		.pipe(iso.inv)
		.build();
	return {
		optics: OpticsKind.Lens,
		get: B.compose(iso.fwd, Pair.fst(iso.fwd.output)),
		set: Reader.fromReader(set0),
		set0,
		modify,
		modify0: (func: IF<A, B>): IF<S, T> =>
			composer(iso.fwd)
				.pipe((t) => Pair.first(t)(func))
				.pipe(iso.inv)
				.build(),
		modifyC: <Ctx extends $A>(
			func: IF<APair<A, Ctx>, B>,
		): IF<APair<S, Ctx>, T> =>
			Reader.toUsesCtx(modify(Reader.fromReader(func))).func,
	};
};

export const prismFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
>(
	_iso: IIsoFA<S, T, AEither<R, A>, AEither<R, B>>,
): IPrism<S, T, A, B> => {
	throw new Error("TODO");
};

export const affineFromIso = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
	R extends $A,
	P extends $A,
>(
	_iso: IIsoFA<S, T, AEither<R, APair<A, P>>, AEither<R, APair<B, P>>>,
): IPrism<S, T, A, B> => {
	throw new Error("TODO");
};
