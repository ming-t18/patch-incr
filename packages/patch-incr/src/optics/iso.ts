import * as Arr from "@/builder/array";
import { composeMemo, composeReeval } from "@/builder/compose";
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
	// Duplicate of {Lens,Prism,Traversal}.composeIso
	// const over = (f: IF<B, B>): IF<T, T> => o.over(composeMemo(fw, f, bw));
	// const overCtx = <Ctx>(f: IF<[B, Ctx], B>: IF<[T, Ctx], T>) => o.overCtx();
	if (o.kind === OpticsKind.Traversal) {
		return traversalComposeIso(o, iso);
	}
	if (o.kind === OpticsKind.Prism) {
		return prismComposeIso(o, iso);
	}
	return lensComposeIso(o, iso);
};

// TODO implement residual versions: residual-lens, residual-prism, residual-affine, residual-traversal
