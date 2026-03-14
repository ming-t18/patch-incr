import { getReplaceOnly, isReplaceOnly } from "@/algebra";
import * as B from "@/builder";
import * as Arr from "@/builder/array";
import { distl } from "@/builder/array/dist";
import { bind } from "@/builder/bind";
import { composeMemo, composeReeval } from "@/builder/compose";
import * as Pair from "@/builder/pair";
import { template0 } from "@/builder/struct";
import {
	applyGet,
	applyPatches,
	type PatchEntry,
	type Patches,
	PatchOp,
	type Path,
} from "@/patch";
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

export const doAssign = <Result, Out, Residual extends Result = Result>(): IF<
	[ByPath<Out>, Residual],
	Result
> => {
	type Args = [ByPath<Out>, Residual];
	const evaluateDoAssign = ([entries, input]: Args): Result =>
		applyPatches(
			input,
			entries.map(([path, value]) => ({
				op: PatchOp.Replace,
				path,
				value,
			})),
		);

	const resultSchema = ps.atomic<Result>();
	const pathSchema = ps.atomic<Path>();
	const outSchema = ps.atomic<Out>();
	const entrySchema = ps.tuple(pathSchema, outSchema);
	const entriesSchema = ps.array(entrySchema);
	const residualSchema = ps.atomic<Residual>();
	const argsSchema = ps.tuple(entriesSchema, residualSchema);
	const forwardDoAssign = (
		args: Args,
		dArgs: Patches<Args>,
		result: Result,
	): Patches<Result> => {
		const [entries, _residual] = args;
		const res = argsSchema.analyze(dArgs);
		if (res === null) {
			return resultSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return resultSchema.fromReplace(evaluateDoAssign(getReplaceOnly(res)));
		}
		const dEntries = res[0]?.inner ?? entriesSchema.empty;
		const dResidual = res[1]?.inner ?? residualSchema.empty;
		// const residual1 = residualSchema.apply(residual, dResidual);

		if (!residualSchema.isEmpty(dResidual)) {
			return resultSchema.fromReplace(
				evaluateDoAssign(argsSchema.apply(args, dArgs)),
			);
		}
		const resEntries = entriesSchema.analyze(dEntries);
		if (resEntries === null) {
			return resultSchema.empty;
		}
		if (isReplaceOnly(resEntries)) {
			return resultSchema.fromReplace(
				evaluateDoAssign(argsSchema.apply(args, dArgs)),
			);
		}

		let result1 = result;
		let entries1 = entries;
		const patches: Patches<Result> = [];
		const doRevert = (path: Path) => {
			const entry = {
				op: PatchOp.Replace,
				path,
				value: applyGet(result1, path),
			};
			result1 = resultSchema.apply(result, [entry]);
			patches.push(entry);
		};
		const doReplace = (path: Path, value: unknown) => {
			// write new value
			const entry = {
				op: PatchOp.Replace,
				path,
				value,
			};
			result1 = resultSchema.apply(result, [entry]);
			patches.push(entry);
		};
		const doApply = (entry: PatchEntry<Result>) => {
			result1 = resultSchema.apply(result, [entry]);
			patches.push(entry);
		};
		for (const resEntry of resEntries) {
			if ("inner" in resEntry) {
				const index = resEntry.path[0];
				const dPair = resEntry.inner;
				if (dPair.path.length === 0) {
					throw new Error("not possible (handled by Replace)");
				}
				if (dPair.path[0] === 1) {
					doApply({ ...dPair, path: dPair.path.slice(1) } as PatchEntry);
				} else if (dPair.path[0] === 0) {
					// path changing
					const [prevPath, value] = entries1[index];
					const nextPath = applyPatches(prevPath, [
						{
							...dPair,
							path: dPair.path.slice(1),
						} as PatchEntry,
					]);
					doRevert(prevPath);
					doReplace(nextPath, value);
				} else {
					throw new Error();
				}

				const entries2 = applyPatches(entries1, [
					{
						...resEntry.inner,
						path: [...resEntry.path, ...resEntry.inner.path],
					} as PatchEntry,
				]);
				entries1 = entries2;
				continue;
			}

			const entries2 = applyPatches(entries1, [resEntry]);
			const { op } = resEntry;
			if (op === PatchOp.Remove || op === PatchOp.Replace) {
				const [index] = resEntry.path;
				const [path] = entries2[index];
				doRevert(path);
			}
			if (op === PatchOp.Add || op === PatchOp.Replace) {
				const {
					value: [path, value],
				} = resEntry;
				doReplace(path, value);
			}
			entries1 = entries2;
		}

		return patches;
	};

	return {
		evaluate: evaluateDoAssign,
		forward: forwardDoAssign,
	};
};
