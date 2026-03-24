import { castOutput, identity as id } from "@/builder";
import * as Arr from "@/builder/array";
import { composeMemo } from "@/builder/compose";
import type * as Either from "@/builder/either";
import * as Option from "@/builder/option";
import * as Pair from "@/builder/pair";
import { tupleFor } from "@/builder/struct";
import type { IIso } from "@/iso/types";
import type { IF } from "@/types";
import { composeIsoPrism } from "./iso";
import * as OPair from "./pair";
import {
	type AnyOptics,
	type ComposeFamily,
	type ILens,
	type IOptics,
	type IPrism,
	type ISetters,
	type ITraversal,
	OpticsKind,
} from "./types";

export const identity = <T>(): ILens<T, T, []> => ({
	kind: OpticsKind.Lens,
	get: id(),
	over: id,
	set: Pair.snd(),
	overCtx: Pair.fst,
});

export const toPrism = <T, A, F = never>(
	o1: ILens<T, A, F> | IPrism<T, A, F>,
): IPrism<T, A, F> => {
	if (o1.kind === OpticsKind.Prism) {
		return o1;
	}
	if (o1.kind === OpticsKind.Lens) {
		const { kind: _, get, ...rest } = o1;
		return {
			kind: OpticsKind.Prism,
			getOpt: castOutput(tupleFor<T>()(o1.get)),
			...rest,
		};
	}
	throw new Error("toPrism: not allowed");
};

export const toTraversal = <T, A, F = never>(
	o1: IOptics<T, A, F>,
): ITraversal<T, A, F> => {
	if (o1.kind === OpticsKind.Traversal) {
		return o1;
	}
	if (o1.kind === OpticsKind.Prism) {
		const { kind: _, getOpt, ...rest } = o1;
		return {
			kind: OpticsKind.Traversal,
			getMulti: castOutput(getOpt),
			...rest,
		};
	}
	if (o1.kind === OpticsKind.Lens) {
		const { kind: _, get, ...rest } = o1;
		return {
			kind: OpticsKind.Traversal,
			getMulti: castOutput(tupleFor<T>()(get)),
			...rest,
		};
	}
	throw new Error();
};

export { composeIso } from "./iso";
export const toOptics = <T, A, F = never>(
	o: IOptics<T, A, F>,
): IOptics<T, A, F> => o;

const composeSetters = <T, A, B>(
	o1: ISetters<T, A>,
	o2: ISetters<A, B>,
): ISetters<T, B> => {
	return {
		set: o1.overCtx(o2.set),
		over: (func) => o1.over(o2.over(func)),
		overCtx: <Ctx>(func: IF<[B, Ctx], B>): IF<[T, Ctx], T> =>
			o1.overCtx(o2.overCtx(func)),
	};
};

export const compose2 = <T extends WeakKey, A, B, F1 = never, F2 = never>(
	o1: IOptics<T, A, F1>,
	o2: IOptics<A, B, F2>,
): IOptics<T, B, ComposeFamily<F1, F2>> => {
	const setters = composeSetters(o1, o2);
	if (o1.kind === OpticsKind.Traversal) {
		if (o2.kind === OpticsKind.Traversal || o2.kind === OpticsKind.Prism) {
			const o3 = toTraversal(o2);
			return {
				kind: OpticsKind.Traversal,
				getMulti: composeMemo(o1.getMulti, Arr.flatMapSingle(o3.getMulti)),
				...setters,
			};
		}
		return {
			kind: OpticsKind.Traversal,
			getMulti: composeMemo(o1.getMulti, Arr.map(o2.get)),
			...setters,
		};
	}

	if (o1.kind === OpticsKind.Prism) {
		if (o2.kind === OpticsKind.Traversal) {
			const o3 = toTraversal(o1);
			return {
				kind: OpticsKind.Traversal,
				getMulti: composeMemo(o3.getMulti, Arr.flatMapSingle(o2.getMulti)),
				...setters,
			};
		}
		if (o2.kind === OpticsKind.Prism) {
			return {
				kind: OpticsKind.Prism,
				getOpt: Option.compose(o1.getOpt, o2.getOpt),
				...setters,
			};
		}
		return {
			kind: OpticsKind.Prism,
			getOpt: composeMemo(o1.getOpt, Option.map(o2.get)),
			...setters,
		};
	}

	if (o2.kind === OpticsKind.Traversal) {
		return {
			kind: OpticsKind.Traversal,
			getMulti: composeMemo(o1.get, o2.getMulti),
			...setters,
		};
	}
	if (o2.kind === OpticsKind.Prism) {
		return {
			kind: OpticsKind.Prism,
			getOpt: composeMemo(o1.get, o2.getOpt),
			...setters,
		};
	}
	return {
		kind: OpticsKind.Lens,
		get: composeMemo(o1.get, o2.get),
		...setters,
	};
};

export const compose3 = <
	T extends WeakKey,
	A,
	B,
	C,
	F1 = never,
	F2 = never,
	F3 = never,
>(
	o1: IOptics<T, A, F1>,
	o2: IOptics<A, B, F2>,
	o3: IOptics<B, C, F3>,
): IOptics<T, C, ComposeFamily<ComposeFamily<F1, F2>, F3>> =>
	compose2(compose2(o1, o2), o3);

export const compose4 = <
	T extends WeakKey,
	A,
	B,
	C,
	D,
	F1 = never,
	F2 = never,
	F3 = never,
	F4 = never,
>(
	o1: IOptics<T, A, F1>,
	o2: IOptics<A, B, F2>,
	o3: IOptics<B, C, F3>,
	o4: IOptics<C, D, F4>,
): IOptics<T, D, ComposeFamily<ComposeFamily<ComposeFamily<F1, F2>, F3>, F4>> =>
	compose2(compose2(compose2(o1, o2), o3), o4);

export const compose5 = <
	T extends WeakKey,
	A,
	B,
	C,
	D,
	E,
	F1 = never,
	F2 = never,
	F3 = never,
	F4 = never,
	F5 = never,
>(
	o1: IOptics<T, A, F1>,
	o2: IOptics<A, B, F2>,
	o3: IOptics<B, C, F3>,
	o4: IOptics<C, D, F4>,
	o5: IOptics<D, E, F5>,
): IOptics<
	T,
	E,
	ComposeFamily<ComposeFamily<ComposeFamily<ComposeFamily<F1, F2>, F3>, F4>, F5>
> => compose2(compose2(compose2(compose2(o1, o2), o3), o4), o5);

export interface Compose {
	<T extends WeakKey>(): IOptics<T, T, []>;
	<T extends WeakKey, A, F>(o: IOptics<T, A, F>): IOptics<T, A, F>;
	<T extends WeakKey, A, B, F1 = never, F2 = never>(
		o1: IOptics<T, A, F1>,
		o2: IOptics<A, B, F2>,
	): IOptics<T, B, ComposeFamily<F1, F2>>;
	<T extends WeakKey, A, B, C, F1 = never, F2 = never, F3 = never>(
		o1: IOptics<T, A, F1>,
		o2: IOptics<A, B, F2>,
		o3: IOptics<B, C, F3>,
	): IOptics<T, C, ComposeFamily<ComposeFamily<F1, F2>, F3>>;
	<
		T extends WeakKey,
		A,
		B,
		C,
		D,
		F1 = never,
		F2 = never,
		F3 = never,
		F4 = never,
	>(
		o1: IOptics<T, A, F1>,
		o2: IOptics<A, B, F2>,
		o3: IOptics<B, C, F3>,
		o4: IOptics<C, D, F4>,
	): IOptics<T, D, ComposeFamily<ComposeFamily<ComposeFamily<F1, F2>, F3>, F4>>;
	<
		T extends WeakKey,
		A,
		B,
		C,
		D,
		E,
		F1 = never,
		F2 = never,
		F3 = never,
		F4 = never,
		F5 = never,
	>(
		o1: IOptics<T, A, F1>,
		o2: IOptics<A, B, F2>,
		o3: IOptics<B, C, F3>,
		o4: IOptics<C, D, F4>,
		o5: IOptics<D, E, F5>,
	): IOptics<
		T,
		E,
		ComposeFamily<
			ComposeFamily<ComposeFamily<ComposeFamily<F1, F2>, F3>, F4>,
			F5
		>
	>;
}
export const compose = ((...fs: AnyOptics[]): AnyOptics => {
	if (fs.length === 0) {
		return identity();
	}
	if (fs.length === 1) {
		return fs[0];
	}
	if (fs.length === 2) {
		return compose2(...(fs as [AnyOptics, AnyOptics]));
	}
	if (fs.length === 3) {
		return compose3(...(fs as [AnyOptics, AnyOptics, AnyOptics]));
	}
	if (fs.length === 4) {
		return compose4(...(fs as [AnyOptics, AnyOptics, AnyOptics, AnyOptics]));
	}
	if (fs.length === 5) {
		return compose5(
			...(fs as [AnyOptics, AnyOptics, AnyOptics, AnyOptics, AnyOptics]),
		);
	}
	// @ts-expect-error Can't be checked
	return compose(compose(...fs.slice(0, 5)), ...fs.slice(5));
}) as Compose;

export const composeIsoAffine = <
	T extends WeakKey,
	A extends WeakKey,
	B,
	R,
	S,
	F = never,
>(
	o: IOptics<T, A, F>,
	iso: IIso<A, Either.Either<[B, R], S>>,
): IOptics<T, B, [F, { cast: B }]> => {
	const o1 = composeIsoPrism(o, iso);
	return compose(o1, OPair.fst()) satisfies IOptics<
		T,
		B,
		[F, { cast: [B, R] }, 0]
	> as IOptics<T, B, never>;
};
