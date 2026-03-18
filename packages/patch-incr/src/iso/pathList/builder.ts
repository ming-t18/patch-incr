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
	PatchOp,
	type Path,
	removePatches,
	replacePatches,
} from "@/patch";
import { applyGetOpt } from "@/patch/access";
import { pathEquals, pathIsPrefix } from "@/patch/helpers";
import * as ps from "@/patchSchema";
import type { IF } from "@/types";
import { fromPair } from "../builder";
import type { IIso } from "../types";
import type { AcceptPath, ByPath, PathListOptics } from "./types";

const composeAcceptPath =
	(f1: AcceptPath, f2: AcceptPath): AcceptPath =>
	(path: Path) => {
		const res1 = f1(path);
		if (!res1) {
			return null;
		}

		return f2(res1);
	};

const plusAcceptPath =
	(fs: { acceptPath: AcceptPath }[]): AcceptPath =>
	(path: Path) => {
		for (const { acceptPath } of fs) {
			const res = acceptPath(path);
			if (res) {
				return res;
			}
		}
		return null;
	};

export const empty = <A, T = never>(): PathListOptics<A, T> => ({
	func: B.constant([] as ByPath<T>),
	acceptPath: (_) => null,
});

export const identity = <A>(): PathListOptics<A, A> => ({
	func: template0((value: A): ByPath<A> => [[[], value]]),
	acceptPath: (path) => path,
});

const joinPaths: IF<[Path, Path], Path> = B.atomicFunc(([a, b]) => [
	...a,
	...b,
]);

export const composeFlatMap = <A extends WeakKey, B, C>(
	{ func: f1, acceptPath: check1 }: PathListOptics<A, B>,
	{ func: f2, acceptPath: check2 }: PathListOptics<B, C>,
): PathListOptics<A, C> => {
	return {
		func: composeMemo(
			f1,
			Arr.flatMap<[Path, B], [Path, C]>(
				composeMemo(
					Pair.second(f2),
					distl(),
					Arr.map(composeReeval(Pair.assocLeft(), Pair.first(joinPaths))),
				),
			),
			Pair.fst(),
		),
		acceptPath: composeAcceptPath(check1, check2),
	};
};

export const plus = <T extends WeakKey, A>(
	...pls: PathListOptics<T, A>[]
): PathListOptics<T, A> => {
	const fs = pls.map((x) => x.func);
	return {
		func: composeMemo(
			tupleFor<T>()(...fs) as IF<T, ByPath<A>[]>,
			concat(),
			Pair.fst(),
		),
		acceptPath: plusAcceptPath(pls),
	};
};

export const plusMany = <T extends WeakKey, A>(
	func: IF<T, ByPath<A>[]>,
	acceptPath: AcceptPath,
): PathListOptics<T, A> => ({
	func: composeMemo(func, concat(), Pair.fst()),
	acceptPath,
});

export const composeBind = <A extends WeakKey, B, C>(
	{ func: f1, acceptPath: check1 }: PathListOptics<A, B>,
	{ func: f2, acceptPath: check2 }: PathListOptics<B, C>,
): PathListOptics<A, C> => {
	return {
		func: composeMemo(
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
		),
		acceptPath: composeAcceptPath(check1, check2),
	};
};

export const composeNonIncremental = <A extends WeakKey, B, C>(
	{ func: f1, acceptPath: check1 }: PathListOptics<A, B>,
	{ func: f2, acceptPath: check2 }: PathListOptics<B, C>,
): PathListOptics<A, C> => {
	return {
		func: B.atomicFunc((x: A) =>
			f1
				.evaluate(x)
				.flatMap(([prefix, b]: [Path, B]) =>
					f2
						.evaluate(b)
						.map(([path, c]: [Path, C]): [Path, C] => [
							[...prefix, ...path],
							c,
						]),
				),
		),
		acceptPath: composeAcceptPath(check1, check2),
	};
};

export const getAll = <T extends WeakKey, A>({
	func: f1,
}: PathListOptics<T, A>): IF<T, A[]> => composeMemo(f1, Arr.map(Pair.snd()));

export const setAll = <T extends WeakKey, A>(
	{ func: f1 }: PathListOptics<T, A>,
	setter: IF<A, A>,
): IF<T, T> =>
	composeMemo(
		Pair.pair(composeMemo(f1, Arr.map(Pair.second(setter))), B.identity()),
		doAssign(),
	);

export const setAllWithPath = <T extends WeakKey, A>(
	{ func: f1 }: PathListOptics<T, A>,
	setter: IF<[Path, A], A>,
): IF<T, T> =>
	composeMemo(
		Pair.pair(
			composeMemo(f1, Arr.map(Pair.pair(Pair.fst(), setter))),
			B.identity(),
		),
		doAssign(),
	);

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

const getMaskedResidualChanges = <T, A>(
	byPath: ByPath<A>,
	dx: Patches<T>,
): Patches<T> => {
	return dx.filter(({ path }) => {
		const isCovered = byPath.some(([pathOverwritten]) =>
			pathIsPrefix(path, pathOverwritten),
		);
		if (isCovered) {
			return true;
		}
		const isBeingOverwritten = byPath.some(([pathOverwritten]) =>
			pathIsPrefix(pathOverwritten, path),
		);
		return !isBeingOverwritten;
	});
};

// TODO generate a list of ByPath that needs to be re-applied
const getNonOverwittenChanges = <T, A>(
	byPath: ByPath<A>,
	patches: Patches<T>,
): [Patches<T>, ByPath<A>] => {
	const res: Patches<T> = [];
	const filtered: ByPath<A> = [];
	for (const entry of patches) {
		const entryPath = entry.path;
		let found = false;
		for (const pair of byPath) {
			const [path] = pair;
			if (pathIsPrefix(entryPath, path)) {
				filtered.push(pair);
				found = true;
			}
		}

		if (found) {
			continue;
		}
		if (!byPath.some(([prefix]) => pathIsPrefix(prefix, entryPath))) {
			res.push(entry);
		}
	}
	return [res, filtered];
};

const makeDResidualReapply = <T, A>(
	dAssign: Patches<T>,
	toReapply: ByPath<A>,
): Patches<T> => {
	const res: Patches<T> = [];
	for (const [pathReapply, valueReapply] of toReapply) {
		const isOverwritten = dAssign.some((entry) => {
			if (entry.op !== PatchOp.Replace) {
				return false;
			}
			if (pathEquals(entry.path, pathReapply)) {
				return true;
			}

			// entry.path = [...pathReapply, key] and overwritten value is same
			if (
				entry.path.length === pathReapply.length + 1 &&
				pathIsPrefix(pathReapply, entry.path)
			) {
				const key = entry.path[pathReapply.length];
				const newValue = applyGetOpt(entry.value, [key]);
				if (Object.is(newValue, valueReapply)) {
					return true;
				}
			}
			return false;
		});
		if (isOverwritten) {
			continue;
		}

		res.push({
			op: PatchOp.Replace,
			path: pathReapply,
			value: valueReapply,
		});
	}
	return res;
};

const maskResidualChanges = <Residual, Out>(): IF<
	[ByPath<Out>, Residual],
	Residual
> => {
	const byPathSchema = ps.atomic<ByPath<Out>>();
	const residualSchema = ps.atomic<Residual>();
	const pairSchema = ps.tuple(byPathSchema, residualSchema);
	return {
		evaluate: ([_, r]: [ByPath<Out>, Residual]): Residual => r,
		forward: (
			[byPath]: [ByPath<Out>, Residual],
			dPair: Patches<[ByPath<Out>, Residual]>,
			_1: Residual,
		): Patches<Residual> => {
			const res = pairSchema.analyze(dPair);
			if (res === null) {
				return residualSchema.empty;
			}

			if (isReplaceOnly(res)) {
				return residualSchema.fromReplace(getReplaceOnly(res)[1]);
			}

			const dResidual = res[1]?.inner;
			if (!dResidual) {
				return residualSchema.empty;
			}
			return getMaskedResidualChanges(byPath, dResidual) as Patches;
		},
	};
};

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
		if (
			byPathSchema.isReplace(dByPath) ||
			residualSchema.isReplace(dResidual)
		) {
			const args1 = applyPatches(args, dArgs);
			return resultSchema.fromReplace(evaluateDoAssign(args1));
		}

		// When residual changes:
		// Change residual then apply doAssignBind with the updated residual
		const [dResidualFiltered, toReapply] = getNonOverwittenChanges(
			byPath,
			dResidual,
		);
		const residual1 = residualSchema.apply(residual, dResidualFiltered);
		// console.log({ residual1, byPath, dByPath, out });
		const dAssign = getReduce(residual1).forward(byPath, dByPath, out);
		const dResidualReapply: Patches<Result> = makeDResidualReapply(
			dAssign,
			toReapply,
		);
		return [...dResidual, ...dResidualReapply, ...dAssign];
	};

	return { evaluate: evaluateDoAssign, forward: forwardDoAssign };
};

export const mapByPathValues = <A, B>(
	func: IF<A, B>,
): IF<ByPath<A>, ByPath<B>> => Arr.map(Pair.second(func));

export const pathListIso = <T extends WeakKey, A>(
	{ func: toPathList }: PathListOptics<T, A>,
	maskOut = false,
): IIso<T, [ByPath<A>, T]> =>
	fromPair(
		maskOut
			? composeMemo(
					Pair.pair(toPathList, B.identity()),
					Pair.pair(Pair.fst(), maskResidualChanges<T, A>()),
				)
			: Pair.pair(toPathList, B.identity()),
		doAssign<T, A, T>(),
	);
