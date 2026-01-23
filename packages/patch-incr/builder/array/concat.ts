import type { ChangeBuilder } from "../../algebra";
import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import {
	CannotReduce,
	type PatchEntry,
	type Patches,
	PatchOp,
	reduceReplaceRoot,
	replacePatches,
} from "../../patch";
import * as ps from "../../patchSchema";
import {
	IndexEnd,
	type PatchSchema,
	type PatchSchemaArrayEntry,
} from "../../patchSchema/types";
import type { IF } from "../../types";
import { splice } from "./helpers/arrayPatch";
import { forwardWithArraySchema } from "./helpers/forwardArray";
import { scan } from "./scan";

export const concat = <T>(): IF<T[][], [T[], number[]]> => {
	const elemSchema = ps.atomic<T>();
	const inArraySchema = ps.array(elemSchema);
	const inputSchema = ps.array(inArraySchema) satisfies PatchSchema<T[][]>;
	const csumSchema = ps.array(ps.atomic<number>());
	const concatSchema = ps.array(elemSchema);
	const outSchema = ps.tuple(concatSchema, csumSchema) satisfies PatchSchema<
		[T[], number[]]
	>;

	const csum = scan((acc: number, { length }: T[]) => acc + length, 0);
	const evaluateCombine = (xs: T[][]): T[] => {
		const combined: T[] = [];
		for (let i = 0; i < xs.length; i++) {
			const a = xs[i];
			const n = a.length;
			for (let j = 0; j < n; j++) {
				combined.push(a[j]);
			}
		}
		return combined;
	};

	const evaluateConcat = (xss: T[][]): [T[], number[]] => [
		evaluateCombine(xss),
		csum.evaluate(xss),
	];

	const forwardConcat = forwardWithArraySchema(
		inputSchema,
		outSchema,
		evaluateConcat,
		(
			xs1: T[][],
			entryOuter: PatchSchemaArrayEntry<T[]>,
			[_ys, cys]: [T[], number[]],
		): Patches<[T[], number[]]> | CannotReduce => {
			if (xs1.length === 0) {
				return CannotReduce;
			}

			const path = entryOuter.path;
			const index = path[0] === IndexEnd ? xs1.length : (path[0] as number);
			const indexMapped = index === 0 ? 0 : cys[index - 1];
			let listPatches: Patches<T[]> | null = null;
			if ("inner" in entryOuter) {
				const entryOnInArray: PatchEntry<T[]> = entryOuter.inner;
				const resInArray = inArraySchema.analyze(
					inArraySchema.fromPatchEntries([entryOnInArray]),
				);
				if (resInArray === null) {
					return outSchema.empty;
				}
				if (isReplaceOnly(resInArray)) {
					const builder: ChangeBuilder<Patches<T[]>> = concatSchema.builder();
					const toRemove = (xs1[indexMapped] as T[]).length;
					const toAdd: T[] = getReplaceOnly(resInArray);
					builder.append(splice(indexMapped, toRemove, toAdd));
					listPatches = builder.build();
				} else if (resInArray.length !== 1) {
					throw new Error("not possible");
				} else {
					const entryElem = resInArray[0];
					if ("inner" in entryElem) {
						const off = entryElem.path[0];
						listPatches = concatSchema.liftIndex(
							indexMapped + off,
							elemSchema.fromPatchEntries([entryElem.inner]),
						);
					} else {
						const off =
							entryElem.path[0] === IndexEnd
								? xs1[index].length
								: entryElem.path[0];
						listPatches = concatSchema.fromPatchEntries([
							{ ...entryElem, path: [indexMapped + off] },
						]);
					}
				}
			} else {
				const builder: ChangeBuilder<Patches<T[]>> = concatSchema.builder();
				let toRemove = 0;
				if (
					entryOuter.op === PatchOp.Remove ||
					entryOuter.op === PatchOp.Replace
				) {
					toRemove = (xs1[index] as T[]).length;
				}
				let toAdd: T[] = [];
				if (
					entryOuter.op === PatchOp.Add ||
					entryOuter.op === PatchOp.Replace
				) {
					toAdd = entryOuter.value;
				}
				builder.append(splice(indexMapped, toRemove, toAdd));
				listPatches = builder.build();
			}

			if (listPatches === null) {
				return CannotReduce;
			}
			const csumPatches = csum.forward(
				xs1,
				inputSchema.fromEntries([entryOuter]),
				cys,
			);
			return outSchema.combine(
				outSchema.liftIndex(0, listPatches),
				outSchema.liftIndex(1, csumPatches),
			);
		},
	);

	return {
		evaluate: evaluateConcat,
		forward: (xs: T[][], dxs: Patches<T[][]>, p: [T[], number[]]) => {
			const res = reduceReplaceRoot(dxs);
			if ("replace" in res) {
				return replacePatches<[T[], number[]]>(evaluateConcat(res.replace));
			}

			return forwardConcat(xs, dxs, p);
		},
	};
};
