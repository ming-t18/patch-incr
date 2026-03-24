import { castOutput, identity } from "@/builder";
import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import * as Option from "@/builder/option";
import * as Pair from "@/builder/pair";
import * as S from "@/builder/struct";
import { assignWith } from "@/builder/struct/assign";
import type { AccessPath, AccessPathOpt } from "@/builder/typeHelpers";
import type { Path } from "@/patch";
import { applyGetOpt } from "@/patch/access";
import type { IF } from "@/types";
import { type ILens, type IPrism, OpticsKind } from "./types";

const makeOver =
	<T extends WeakKey, A>(path: Path) =>
	(func: IF<A, A>): IF<T, T> => {
		const over1: IF<T, A> = composeMemo(
			S.accessPathFor<T>()<Path, A>(path),
			func,
		);
		return assignWith<T, T>([
			{
				path,
				getValue: castOutput(over1),
			},
		]);
	};

const makeOverCtx =
	<
		T extends WeakKey,
		P extends Path,
		A extends AccessPath<T, P> = AccessPath<T, P>,
	>(
		path: P,
	) =>
	<Ctx>(func: IF<[A, Ctx], A>): IF<[T, Ctx], T> => {
		const over1: IF<[T, Ctx], A> = composeMemo(
			Pair.first(S.accessPathFor<T>()<Path, A>(path)),
			func,
		);
		return composeMemo(
			assignWith<[T, Ctx], [T, Ctx]>([
				{
					path: [0, ...path],
					getValue: castOutput(over1),
				},
			]),
			Pair.fst(),
		);
	};

const makeSet = <
	T extends WeakKey,
	P extends Path,
	A extends AccessPath<T, P> = AccessPath<T, P>,
>(
	path: P,
): IF<[T, A], T> => {
	const setter: IF<[T, A], A> = Pair.snd();
	return composeMemo(
		assignWith<[T, A], [T, A]>([
			{
				path: [0, ...path],
				getValue: castOutput(setter),
			},
		]),
		Pair.fst(),
	);
};

export const accessPath =
	<T extends WeakKey>() =>
	<P extends Path, A extends AccessPath<T, P> = AccessPath<T, P>>(
		path: [...P],
	): ILens<T, A, P> => ({
		kind: OpticsKind.Lens,
		get: S.accessPathFor<T>()<Path, A>(path),
		set: makeSet(path),
		over: makeOver(path),
		overCtx: makeOverCtx(path),
	});

export const accessPathOpt1 =
	<T extends WeakKey>() =>
	<P extends Path, A extends AccessPathOpt<T, P> = AccessPathOpt<T, P>>(
		path: [...P],
	): IPrism<T, A, { opt: P }> => ({
		kind: OpticsKind.Prism,
		getOpt: composeMemo(S.accessPathOpt<A, T>(path), Option.fromDefined()),
		set: condSingle(
			([input]: [T, A]) => applyGetOpt(input, path) !== undefined,
			makeSet<T, P, A>(path),
			Pair.fst<T, A>(),
		),
		over: (func: IF<A, A>): IF<T, T> =>
			condSingle(
				(input: T) => applyGetOpt(input, path) !== undefined,
				makeOver<T, A>(path)(func),
				identity(),
			),
		overCtx: <Ctx>(func: IF<[A, Ctx], A>): IF<[T, Ctx], T> =>
			condSingle(
				([input]: [T, Ctx]) => applyGetOpt(input, path) !== undefined,
				makeOverCtx<T, P, A>(path)(func),
				Pair.fst<T, Ctx>(),
			),
	});
