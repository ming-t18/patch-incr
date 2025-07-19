import type { DRO, InferApplyType } from "../../../algebra";
import { getReplaceOnly, isReplaceOnly } from "../../../algebra/replaceOnly";
import {
	CannotReduce,
	type PatchAdd,
	type PatchEntry,
	type Patches,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Targeted,
} from "../../../patch";
import * as ps from "../../../patchSchema";
import type {
	AnyPatchSchema,
	IndexEnd,
	PatchSchema,
} from "../../../patchSchema/types";
import type { IF } from "../../../types";
import type { ListView } from "./types";

export type PatchSchemaListViewEntry<N, Elem> =
	| { path: [number]; inner: PatchEntry<Elem> }
	| (PatchRemove<[number]> & Targeted<N>)
	| (PatchAdd<[number | IndexEnd], Elem> & Targeted<N>)
	| (PatchReplace<[number], Elem> & Targeted<N>);

export interface PatchSchemaListView<
	S extends AnyPatchSchema,
	N,
	Elem = InferApplyType<S>,
> extends PatchSchema<N, Patches<N>> {
	readonly $elem: S;
	analyze: (
		patches: Patches<N>,
	) => DRO<N> | PatchSchemaListViewEntry<N, Elem>[];
	fromEntries: (entries: PatchSchemaListViewEntry<N, Elem>[]) => Patches<N>;
	liftIndex: (index: number, change: Patches<Elem>) => Patches<N>;
}

const listViewSchemaOf = <
	N,
	S extends AnyPatchSchema,
	Elem = InferApplyType<S>,
>(
	s: S,
	view: ListView<N, Elem>,
): PatchSchemaListView<S, N, Elem> => {
	const arrSchema = ps.array(s);
	return {
		...arrSchema,
		apply: view.applyPatches,
	} as never as PatchSchemaListView<S, N, Elem>;
};

export const listMap = <N1 extends WeakKey | null, N2, Input, Output>(
	f: IF<Input, Output>,
	viewIn: ListView<N1, Input>,
	viewOut: ListView<N2, Output>,
): IF<N1, N2> => {
	const inputSchema = listViewSchemaOf(ps.atomic<Input>(), viewIn);
	const outputSchema = listViewSchemaOf(ps.atomic<Output>(), viewOut);

	const memo = new WeakMap<WeakKey, N2>();
	const evaluateListMap = (input: N1): N2 => {
		const recListMap = (node: N1): N2 => {
			if (node !== null && memo.has(node as WeakKey)) {
				return memo.get(node) as N2;
			}

			const m = viewIn.analyze(node);
			if (m === null) {
				return viewOut.empty;
			}

			const res: N2 = viewOut.create({
				left: recListMap(m.left),
				middle: f.evaluate(m.middle),
				right: recListMap(m.right),
			});

			if (node !== null) {
				memo.set(node, res);
			}
			return res;
		};

		return recListMap(input);
	};

	const forwardEntry = (
		xs1: N1,
		entry: PatchSchemaListViewEntry<N1, Input>,
		ys1: N2,
	): Patches<N2> | CannotReduce => {
		if ("inner" in entry) {
			const index = entry.path[0];
			const out: Patches<Output> = f.forward(
				viewIn.getIndex(xs1, index),
				[entry.inner],
				viewOut.getIndex(ys1, index),
			);
			return outputSchema.liftIndex(index, out);
		}

		if (entry.op === PatchOp.Add || entry.op === PatchOp.Replace) {
			return outputSchema.fromPatchEntries([
				{
					...entry,
					value: f.evaluate(entry.value),
				} as never,
			]);
		}

		return outputSchema.fromPatchEntries([entry as never]);
	};

	const forwardListMap = (xs: N1, change: Patches<N1>, ys: N2): Patches<N2> => {
		const res = inputSchema.analyze(change);
		if (res === null) {
			return outputSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outputSchema.fromReplace(evaluateListMap(getReplaceOnly(res)));
		}

		const combined = outputSchema.builder();
		let xs1 = xs;
		let ys1 = ys;
		for (const entry of res) {
			const res: Patches<N2> | CannotReduce = forwardEntry(xs1, entry, ys1);
			if (res === CannotReduce) {
				return outputSchema.fromReplace(
					evaluateListMap(inputSchema.apply(xs, change)),
				);
			}
			xs1 = inputSchema.apply(xs1, inputSchema.fromEntries([entry]));
			ys1 = outputSchema.apply(ys1, res);
			combined.append(res);
		}
		return combined.build();
	};

	return {
		evaluate: evaluateListMap,
		forward: forwardListMap,
	};
};

export const listReduce = <N extends WeakKey | null, Elem, Output>(
	alg: {
		readonly empty: Output;
		combine: IF<{ left: Output; middle: Elem; right: Output }, Output>;
	},
	view: ListView<N, Elem>,
): IF<N, Output> => {
	const elemSchema = ps.atomic<Elem>();
	const inputSchema = listViewSchemaOf(elemSchema, view);
	const outputSchema = ps.atomic<Output>();
	const memo = new WeakMap<WeakKey, Output>();
	const evaluateReduce = (input: N): Output => {
		const rec = (xs: N): Output => {
			if (xs !== null && memo.has(xs as WeakKey)) {
				return memo.get(xs) as Output;
			}

			const m = view.analyze(xs);
			if (m === null) {
				return alg.empty;
			}

			const res: Output = alg.combine.evaluate({
				left: rec(m.left),
				middle: m.middle,
				right: rec(m.right),
			});

			if (xs !== null) {
				memo.set(xs, res);
			}
			return res;
		};
		return rec(input);
	};

	const _forwardReduceEntry = (
		input: N,
		_entry: PatchSchemaListView<typeof elemSchema, N, Elem>,
		_output: Output,
	): Patches<Output> => {
		const m = view.analyze(input);
		if (m === null) {
			const input1 = inputSchema.apply(input, inputSchema.empty);
			return outputSchema.fromReplace(evaluateReduce(input1));
		}
		throw new Error("TODO");

		// const forwardEntry = (xs1: N, entry: PatchSchemaListViewEntry<N, Elem>, ys1: N): Patches<Output> | CannotReduce => {
		//     if ('inner' in entry) {
		//         const index = entry.path[0];
		//         const out: Patches<Output> = alg.combine.forward(viewIn.getIndex(xs1, index), [entry.inner], viewOut.getIndex(ys1, index));
		//         return outputSchema.liftIndex(index, out);
		//     }

		//     if (entry.op === PatchOp.Add || entry.op === PatchOp.Replace) {
		//         return outputSchema.fromPatchEntries([
		//             {
		//                 ...entry,
		//                 value: f.evaluate(entry.value),
		//             }as never
		//         ])
		//     }

		//     return outputSchema.fromPatchEntries([entry as never])
		// }
	};

	const forwardReduce = (
		_input: N,
		change: Patches<N>,
		_output: Output,
	): Patches<Output> => {
		const res = inputSchema.analyze(change);
		if (res === null) {
			return outputSchema.empty;
		}

		if (isReplaceOnly(res)) {
			return outputSchema.fromReplace(evaluateReduce(getReplaceOnly(res)));
		}

		throw new Error("TODO");
	};

	return {
		evaluate: evaluateReduce,
		forward: forwardReduce,
	};
};
