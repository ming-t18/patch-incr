import * as B from "@/funcs/basic";
import type { IReader } from "@/funcs/reader";
import { type APair, pair } from "@/pair";
import { abc_cba } from "@/product/perm";
import type { $A, IF } from "@/types";
import type { IIsoFA } from "@/types/func/iso";
import { Pair, Reader } from "../modules";
import { type ILens, OpticsKind } from "./types";

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
			B.compose(iso.fwd, B.compose(func, iso.inv)),
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
	const ar: APair<A, R> = iso.fwd.output;
	const _br: APair<B, R> = iso.inv.input;
	const [_b, r] = iso.inv.input.shape;
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
			Reader.compose(Reader.first(r)(func), Reader.lift(ctx)(iso.inv)),
		);
	};

	const sb = pair(s, b);
	const l = Pair.first(sb)(iso.fwd);
	const left = B.compose(l, abc_cba(B.getOutput(l)));
	// [S, B] => [[A, R], B] => [[B, R], A] => [B, R] => T
	const set0: IF<APair<S, B>, T> = B.compose(
		B.compose(left, Pair.fst(B.getOutput(left))),
		iso.inv,
	);
	return {
		optics: OpticsKind.Lens,
		get: B.compose(iso.fwd, Pair.fst(iso.fwd.output)),
		set: Reader.fromReader(set0),
		set0: set0,
		modify,
		modify0: (func: IF<A, B>): IF<S, T> =>
			B.compose(iso.fwd, B.compose(Pair.first(ar)(func), iso.inv)),
		modifyC: <Ctx extends $A>(
			func: IF<APair<A, Ctx>, B>,
		): IF<APair<S, Ctx>, T> =>
			Reader.toUsesCtx(modify(Reader.fromReader(func))).func,
	};
};
