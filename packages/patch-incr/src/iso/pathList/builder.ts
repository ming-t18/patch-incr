import { getReplaceOnly, isReplaceOnly } from "@/algebra";
import type { IncReduceAlgebra } from "@/algebra/incReduce";
import * as B from "@/builder";
import * as Arr from "@/builder/array";
import { concat } from "@/builder/array/concat";
import { distl } from "@/builder/array/dist";
import { reduceInc } from "@/builder/array/reduce";
import { bind, bindMemo } from "@/builder/bind";
import { composeMemo, composeReeval } from "@/builder/compose";
import * as Pair from "@/builder/pair";
import { template0 } from "@/builder/struct";
import { tupleFor } from "@/builder/struct/record";
import {
	applyPatches,
	type PatchEntry,
	type Patches,
	type Path,
	removePatches,
	replacePatches,
} from "@/patch";
import { applyGetOpt } from "@/patch/access";
import { pathEquals, pathIsPrefix } from "@/patch/helpers";
import * as ps from "@/patchSchema";
import type { IF } from "@/types";
import type { ByPath, PathListOptics } from "./types";

export const empty = <A, T = never>(): PathListOptics<A, T> =>
	B.constant([] as ByPath<T>);

export const identity = <A>(): PathListOptics<A, A> =>
	template0((value: A): ByPath<A> => [[[], value]]);

const joinPaths: IF<[Path, Path], Path> = B.atomicFunc(([a, b]) => [
	...a,
	...b,
]);

export const composeFlatMap = <A extends WeakKey, B, C>(
	f1: PathListOptics<A, B>,
	f2: PathListOptics<B, C>,
): PathListOptics<A, C> => {
	return composeMemo(
		f1,
		Arr.flatMap<[Path, B], [Path, C]>(
			composeMemo(
				Pair.second(f2),
				distl(),
				Arr.map(composeReeval(Pair.assocLeft(), Pair.first(joinPaths))),
			),
		),
		Pair.fst(),
	);
};

export const plus = <T extends WeakKey, A>(
	...fs: PathListOptics<T, A>[]
): PathListOptics<T, A> => {
	return composeMemo(
		tupleFor<T>()(...fs) as IF<T, ByPath<A>[]>,
		concat(),
		Pair.fst(),
	);
};

export const plusMany = <T extends WeakKey, A>(
	func: IF<T, ByPath<A>[]>,
): PathListOptics<T, A> => composeMemo(func, concat(), Pair.fst());

export const composeBind = <A extends WeakKey, B, C>(
	f1: PathListOptics<A, B>,
	f2: PathListOptics<B, C>,
): PathListOptics<A, C> => {
	return composeMemo(
		f1,
		Arr.flatMap<[Path, B], [Path, C]>(
			bind(Pair.fst(), (prefix: Path) =>
				composeMemo(
					Pair.snd(),
					f2,
					Arr.map(
						Pair.first(B.atomicFunc((path: Path) => [...prefix, ...path])),
					),
				),
			),
		),
		Pair.fst(),
	);
};

export const composeNonIncremental = <A extends WeakKey, B, C>(
	f1: PathListOptics<A, B>,
	f2: PathListOptics<B, C>,
): PathListOptics<A, C> => {
	return B.atomicFunc((x: A) =>
		f1
			.evaluate(x)
			.flatMap(([prefix, b]: [Path, B]) =>
				f2
					.evaluate(b)
					.map(([path, c]: [Path, C]): [Path, C] => [[...prefix, ...path], c]),
			),
	);
};

export const getAll = <T extends WeakKey, A>(
	f1: PathListOptics<T, A>,
): IF<T, A[]> => {
	return composeMemo(f1, Arr.map(Pair.snd()));
};

export const setAll = <T extends WeakKey, A>(
	f1: PathListOptics<T, A>,
	setter: IF<A, A>,
): IF<T, T> => {
	return composeMemo(
		Pair.pair(composeMemo(f1, Arr.map(Pair.second(setter))), B.identity()),
		doAssign(),
	);
};

export const setAllWithPath = <T extends WeakKey, A>(
	f1: PathListOptics<T, A>,
	setter: IF<[Path, A], A>,
): IF<T, T> => {
	return composeMemo(
		Pair.pair(
			composeMemo(f1, Arr.map(Pair.pair(Pair.fst(), setter))),
			B.identity(),
		),
		doAssign(),
	);
};

export const assignAlgebra = <Base, T = Base, V = unknown>(
	base: Base,
	init: T,
): IncReduceAlgebra<T, [Path, V]> => {
	const add = (acc: T, [path, value]: [Path, V]): T =>
		applyPatches(acc, replacePatches(value, path));
	const remove = (acc: T, [path]: [Path, V]): T => {
		const fromBase: T | undefined = applyGetOpt(base, path);
		return fromBase
			? applyPatches(acc, replacePatches(fromBase, path))
			: applyPatches(acc, removePatches(path));
	};

	const forwardAdd = (_acc: T, [path, value]: [Path, V]): Patches<T> =>
		replacePatches(value, path);
	const forwardRemove = (_acc: T, [path]: [Path, V]): Patches<T> => {
		const fromBase: T | undefined = applyGetOpt(base, path);
		return fromBase ? replacePatches(fromBase, path) : removePatches(path);
	};

	const forwardReplace = (
		acc: T,
		prev: [Path, V],
		next: [Path, V],
	): Patches<T> => {
		const [prevPath] = prev;
		const [nextPath, nextValue] = next;
		if (pathEquals(prevPath, nextPath)) {
			return replacePatches(nextValue, nextPath);
		}
		return [...forwardRemove(acc, prev), ...forwardAdd(acc, next)];
	};
	const pathSchema = ps.atomic<Path>();
	const outSchema = ps.atomic<V>();
	const entrySchema = ps.tuple(pathSchema, outSchema);
	const resultSchema = ps.atomic<T>();
	return {
		init,
		add,
		remove,
		replace: (acc: T, prev: [Path, V], next: [Path, V]): T => {
			const [prevPath] = prev;
			const [nextPath, nextValue] = next;
			if (pathEquals(prevPath, nextPath)) {
				return applyPatches(acc, replacePatches(nextValue, nextPath));
			}
			return add(remove(acc, prev), next);
		},
		forwardInternal: (
			acc: T,
			entry: [Path, V],
			dEntry: Patches<[Path, V]>,
		): Patches<T> => {
			const [path] = entry;
			const res = entrySchema.analyze(dEntry);
			if (res === null) {
				return resultSchema.empty;
			}
			if (isReplaceOnly(res)) {
				return forwardReplace(acc, entry, getReplaceOnly(res));
			}
			const dPath = res[0]?.inner ?? pathSchema.empty;
			const dOut = res[1]?.inner ?? outSchema.empty;

			if (!pathSchema.isEmpty(dPath)) {
				// path changed, do full replace
				const nextPath = pathSchema.apply(path, dPath);
				if (!pathEquals(path, nextPath)) {
					const nextEntry = entrySchema.apply(entry, dEntry);
					return forwardReplace(acc, entry, nextEntry);
				}
			}

			if (outSchema.isEmpty(dOut)) {
				return resultSchema.empty;
			}

			return dOut.map(
				(e) =>
					({
						...e,
						path: [...path, ...e.path],
					}) as PatchEntry<T>,
			);
		},
		forwardAdd,
		forwardRemove,
		forwardReplace,
	};
};

export const doAssignBind = <
	Result extends WeakKey,
	Out,
	Residual extends Result = Result,
>(): IF<[ByPath<Out>, Residual], Result> =>
	bindMemo(Pair.snd(), (residual: Residual) =>
		composeMemo(
			Pair.fst(),
			reduceInc(assignAlgebra<Residual, Result, Out>(residual, residual)),
		),
	);

export const doAssign = <
	Result extends WeakKey,
	Out,
	Residual extends Result = Result,
>(): IF<[ByPath<Out>, Residual], Result> => {
	const resultSchema = ps.atomic<Result>();
	const byPathSchema = ps.atomic<ByPath<Out>>();
	const residualSchema = ps.atomic<Residual>();
	const pairSchema = ps.tuple(byPathSchema, residualSchema);
	type Args = [ByPath<Out>, Residual];

	const memo = new WeakMap<Residual, IF<ByPath<Out>, Result>>();
	const getReduceNoMemo = (residual: Residual) =>
		reduceInc(assignAlgebra<Residual, Result, Out>(residual, residual));
	const getReduce = (residual: Residual) => {
		const res = memo.get(residual);
		if (res) {
			return res;
		}
		const res1 = getReduceNoMemo(residual);
		memo.set(residual, res1);
		return res1;
	};

	const evaluateDoAssign = ([pathList, residual]: Args): Result =>
		getReduce(residual).evaluate(pathList);
	const forwardDoAssign = (
		args: Args,
		dArgs: Patches<Args>,
		out: Result,
	): Patches<Result> => {
		const res = pairSchema.analyze(dArgs);
		if (res === null) {
			return resultSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return resultSchema.fromReplace(evaluateDoAssign(getReplaceOnly(res)));
		}

		const [byPath, residual] = args;
		const dByPath = res[0]?.inner ?? byPathSchema.empty;
		const dResidual = res[1]?.inner ?? residualSchema.empty;
		if (residualSchema.isEmpty(dResidual)) {
			return getReduce(residual).forward(byPath, dByPath, out);
		}

		// When residual changes:
		// Change residual then apply doAssignBind with the updated residual
		const dResidualFiltered = dResidual.filter(
			({ path }) =>
				// Filter out non-overlapping paths
				byPath.findIndex(([pathOverwritten]) =>
					pathIsPrefix(pathOverwritten, path),
				) === -1,
		);
		const residual1 = residualSchema.apply(residual, dResidualFiltered);
		const dAssign = getReduce(residual1).forward(byPath, dByPath, out);
		return [...dResidualFiltered, ...dAssign];
	};

	return { evaluate: evaluateDoAssign, forward: forwardDoAssign };
};
