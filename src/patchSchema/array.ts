import type { DRO, InferApplyType } from "../algebra";
import { makeReplaceOnly } from "../algebra/replaceOnly";
import {
	type PatchEntry,
	PatchOp,
	type Patches,
	reduceReplaceRoot,
} from "../incr/patch";
import { BasePatchSchema } from "./base";
import {
	IndexEnd,
	type PatchSchema,
	type PatchSchemaArray,
	type PatchSchemaArrayEntry,
} from "./types";

export class PatchSchemaArrayImpl<
		S extends PatchSchema<Elem>,
		Elem = InferApplyType<S>,
	>
	extends BasePatchSchema<Elem[]>
	implements PatchSchemaArray<S, Elem>
{
	constructor(public readonly $elem: S) {
		super();
	}

	analyze(
		patches: Patches<Elem[]>,
	): DRO<Elem[]> | PatchSchemaArrayEntry<Elem>[] {
		if (patches.length === 0) {
			return null;
		}

		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}

		const ret: PatchSchemaArrayEntry<Elem>[] = [];
		const len = patches.length;
		let i = 0;
		while (i < len) {
			const entry = patches[i];
			const { op, path } = entry;
			if (path.length === 1) {
				const index = path[0];
				if (index === IndexEnd && op !== PatchOp.Add) {
					throw new Error("can only Add to en end");
				}

				ret.push(entry as never);
				i++;
				continue;
			}

			const i0 = entry.path[0];
			ret.push({
				path: [i0 as number],
				inner: {
					...entry,
					path: entry.path.splice(1),
				} as PatchEntry<Elem>,
			});
		}
		return ret;
	}

	fromEntries(entries: PatchSchemaArrayEntry<Elem>[]): Patches<Elem[]> {
		return entries.map((e) => {
			if ("inner" in e) {
				return { ...e.inner, path: [...e.path, e.inner.path] } as PatchEntry<
					Elem[]
				>;
			}

			return e as PatchEntry<Elem[]>;
		});
	}

	liftIndex(index: number, change: Patches<Elem>): Patches<Elem[]> {
		return change.map(
			(c) =>
				({
					...c,
					path: [index, ...c.path],
				}) as PatchEntry<Elem[]>,
		);
	}
}
