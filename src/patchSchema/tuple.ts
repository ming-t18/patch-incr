import type { DRO, InferApplyType } from "../algebra";
import { makeReplaceOnly } from "../algebra/replaceOnly";
import {
	type PatchEntry,
	type Patches,
	reduceReplaceRoot,
} from "../incr/patch";
import { BasePatchSchema } from "./base";
import type {
	AnyTuple,
	InferTypeFromTupleConstruction,
	InnerPatches,
	PatchSchemaTuple,
	TupleConstruction,
} from "./types";

export class PatchSchemaTupleImpl<
		C extends TupleConstruction,
		Tuple extends AnyTuple = InferTypeFromTupleConstruction<C>,
		Index extends keyof Tuple = keyof Tuple,
	>
	extends BasePatchSchema<Tuple>
	implements PatchSchemaTuple<C, Tuple, Index>
{
	public readonly length: number;
	constructor(public readonly $: C) {
		super();
		this.length = $.length;
	}

	analyze(patches: Patches<Tuple>): DRO<Tuple> | InnerPatches<Tuple, Index> {
		if (patches.length === 0) {
			return null;
		}

		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}

		const tup: InnerPatches<Tuple, Index> = Array(this.length) as never;
		for (const entry of patches) {
			const [key, ...pathInner] = entry.path;
			const key1 = key as Index;
			if (!tup[key1]) {
				tup[key1] = {
					path: [key1],
					inner: [],
				};
			}
			tup[key1].inner.push({ ...entry, path: pathInner } as PatchEntry<never>);
		}
		return tup;
	}

	liftIndex<I extends Index>(
		index: I,
		change: Patches<Tuple[I]>,
	): Patches<Tuple> {
		return change.map(
			(c) =>
				({
					...c,
					path: [index, ...c.path],
				}) as PatchEntry<Tuple>,
		);
	}
}
