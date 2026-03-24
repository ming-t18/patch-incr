import { castOutput } from "@/builder";
import * as Arr from "@/builder/array";
import { composeMemo, composeReeval } from "@/builder/compose";
import * as Either from "@/builder/either";
import * as Option from "@/builder/option";
import * as Pair from "@/builder/pair";
import type { IIso } from "@/iso/types";
import type { IF } from "@/types";
import {
	type ILens,
	type IOptics,
	type IPrism,
	type ISetters,
	type ITraversal,
	OpticsKind,
} from "./types";

export const lensFromIso = <T extends WeakKey, A>({
	fw,
	bw,
}: IIso<T, A>): ILens<T, A, { cast: A }> => ({
	kind: OpticsKind.Lens,
	get: fw,
	set: composeReeval(Pair.snd(), bw),
	over: (f) => composeMemo(fw, f, bw),
	overCtx: <Ctx>(f: IF<[A, Ctx], A>) =>
		composeMemo(Pair.first<T, Ctx, A>(fw), f, bw),
});

// --------------------------------------------------------------------------------
// Compose with: isomorphism

const settersComposeIso = <T extends WeakKey, A extends WeakKey, B>(
	o: ISetters<T, A>,
	{ fw, bw }: IIso<A, B>,
): ISetters<T, B> => ({
	set: composeMemo(Pair.second<T, B, A>(bw), o.set),
	over: (f) => o.over(composeMemo(fw, f, bw)),
	overCtx: <Ctx>(f: IF<[B, Ctx], B>) =>
		o.overCtx<Ctx>(composeMemo(Pair.first(fw), f, bw)),
});

export const lensComposeIso = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	F = never,
>(
	o: ILens<T, A, F>,
	iso: IIso<A, B>,
): ILens<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Lens,
		get: composeMemo(o.get, fw),
		...settersComposeIso(o, iso),
	};
};

export const prismComposeIso = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	F = never,
>(
	o: IPrism<T, A, F>,
	iso: IIso<A, B>,
): IPrism<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Prism,
		getOpt: composeMemo(o.getOpt, Option.map(fw)),
		...settersComposeIso(o, iso),
	};
};

export const traversalComposeIso = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	F = never,
>(
	o: ITraversal<T, A, F>,
	iso: IIso<A, B>,
): ITraversal<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Traversal,
		getMulti: composeMemo(o.getMulti, Arr.map(fw)),
		...settersComposeIso(o, iso),
	};
};

export const composeIso = <T extends WeakKey, A extends WeakKey, B, F = never>(
	o: IOptics<T, A, F>,
	iso: IIso<A, B>,
): IOptics<T, B, [F, { cast: B }]> => {
	if (o.kind === OpticsKind.Traversal) {
		return traversalComposeIso(o, iso);
	}
	if (o.kind === OpticsKind.Prism) {
		return prismComposeIso(o, iso);
	}
	return lensComposeIso(o, iso);
};

// --------------------------------------------------------------------------------
// Compose with: iso-lens with residual

const settersComposeIsoLens = <T extends WeakKey, A extends WeakKey, B, R>(
	o: ISetters<T, A>,
	{ fw, bw }: IIso<A, [B, R]>,
): ISetters<T, B> => ({
	// [A, B] -> [[B, R], B] -> [R, B] -> [B, R] -> A
	set: o.overCtx(
		composeMemo(Pair.first(composeMemo(fw, Pair.snd())), Pair.swap(), bw),
	) satisfies IF<[T, B], T>,
	over: (f) => o.over(composeMemo(fw, Pair.first(f), bw)),
	overCtx: <Ctx>(f: IF<[B, Ctx], B>) =>
		o.overCtx<Ctx>(
			composeMemo(
				Pair.first(fw),
				composeReeval(Pair.abc_acb(), Pair.first(f)),
				bw,
			),
		),
});

export const lensComposeIsoLens = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: ILens<T, A, F>,
	iso: IIso<A, [B, R]>,
): ILens<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Lens,
		get: composeMemo(o.get, fw, Pair.fst<B, R>()),
		...settersComposeIsoLens(o, iso),
	};
};

export const prismComposeIsoLens = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: IPrism<T, A, F>,
	iso: IIso<A, [B, R]>,
): IPrism<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Prism,
		getOpt: composeMemo(o.getOpt, Option.map(composeMemo(fw, Pair.fst()))),
		...settersComposeIsoLens(o, iso),
	};
};

export const traversalComposeIsoLens = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: ITraversal<T, A, F>,
	iso: IIso<A, [B, R]>,
): ITraversal<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Traversal,
		getMulti: composeMemo(o.getMulti, Arr.map(composeMemo(fw, Pair.fst()))),
		...settersComposeIsoLens(o, iso),
	};
};

export const composeIsoLens = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: IOptics<T, A, F>,
	iso: IIso<A, [B, R]>,
): IOptics<T, B, [F, { cast: B }]> => {
	if (o.kind === OpticsKind.Traversal) {
		return traversalComposeIsoLens(o, iso);
	}
	if (o.kind === OpticsKind.Prism) {
		return prismComposeIsoLens(o, iso);
	}
	return lensComposeIsoLens(o, iso);
};

// --------------------------------------------------------------------------------
// Compose with: iso-prism

const settersComposeIsoPrism = <T extends WeakKey, A extends WeakKey, B, R>(
	o: ISetters<T, A>,
	{ fw, bw }: IIso<A, Either.Either<B, R>>,
): ISetters<T, B> => ({
	// [A, B] -> [Either<B, R>, B] -> Either<[B, B], [R, B]> -> Either<B, R> -> A
	set: o.overCtx(
		composeMemo(
			Pair.first(fw),
			Either.distRight(),
			Either.leftRight(Pair.snd(), Pair.fst()),
			bw,
		),
	),
	over: (f) => o.over(composeMemo(fw, Either.left(f), bw)),
	overCtx: <Ctx>(f: IF<[B, Ctx], B>) =>
		o.overCtx<Ctx>(
			composeMemo(
				Pair.first(fw),
				Either.distRight(),
				Either.leftRight(f, Pair.fst()),
				bw,
			),
		),
});

export const lensComposeIsoPrism = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: ILens<T, A, F>,
	iso: IIso<A, Either.Either<B, R>>,
): IPrism<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Prism,
		getOpt: composeMemo(o.get, fw, Either.optionLeft()),
		...settersComposeIsoPrism(o, iso),
	};
};

export const prismComposeIsoPrism = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: IPrism<T, A, F>,
	iso: IIso<A, Either.Either<B, R>>,
): IPrism<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Prism,
		getOpt: composeMemo(
			o.getOpt,
			Option.flatMap(composeMemo(fw, Either.optionLeft())),
		),
		...settersComposeIsoPrism(o, iso),
	};
};

export const traversalComposeIsoPrism = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: ITraversal<T, A, F>,
	iso: IIso<A, Either.Either<B, R>>,
): ITraversal<T, B, [F, { cast: B }]> => {
	const { fw } = iso;
	return {
		kind: OpticsKind.Traversal,
		getMulti: composeMemo(
			o.getMulti,
			Arr.flatMapSingle(castOutput(composeMemo(fw, Either.optionLeft()))),
		),
		...settersComposeIsoPrism(o, iso),
	};
};

export const composeIsoPrism = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	F = never,
>(
	o: IOptics<T, A, F>,
	iso: IIso<A, Either.Either<B, R>>,
): IOptics<T, B, [F, { cast: B }]> => {
	if (o.kind === OpticsKind.Traversal) {
		return traversalComposeIsoPrism(o, iso);
	}
	if (o.kind === OpticsKind.Prism) {
		return prismComposeIsoPrism(o, iso);
	}
	return lensComposeIsoPrism(o, iso);
};
