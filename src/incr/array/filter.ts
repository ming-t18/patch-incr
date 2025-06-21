import * as ps from "../../patchSchema";
import {
	IndexEnd,
	type PatchSchema,
	type PatchSchemaArray,
	type PatchSchemaArrayEntry,
} from "../../patchSchema/types";
import {
	type CannotReduce,
	type PatchEntry,
	type Patches,
	PatchOp,
} from "../patch";
import type { IF } from "../types";
import { forwardWithArraySchema } from "./forwardArray";
import { scan } from "./scan";

const forwardFilterInternal = <T, S extends PatchSchema<T>>(
	pred: (value: T) => boolean,
	xs: T[],
	inner: PatchEntry<T>,
	index: number,
	index1: number,
	valueSchema: PatchSchema<T>,
	outArraySchema: PatchSchemaArray<S, T>,
): Patches<T[]> => {
	const value = xs[index];
	const dInner = valueSchema.fromPatchEntries([inner]);
	const valueUpdated = valueSchema.apply(value, dInner);
	const prev = pred(value);
	const next = pred(valueUpdated);
	if (!prev && !next) {
		return outArraySchema.empty;
	}
	if (prev && next) {
		return outArraySchema.liftIndex(index1, dInner);
	}
	if (prev && !next) {
		return outArraySchema.fromPatchEntries([
			{
				op: PatchOp.Remove,
				path: [index1],
			},
		]);
	}

	// !prev && next
	return outArraySchema.fromPatchEntries([
		{
			op: PatchOp.Add,
			path: [index1],
			value: valueUpdated,
		},
	]);
};

const forwardFilterSingleListOp = <T, S extends PatchSchema<T>>(
	pred: (value: T) => boolean,
	entry: PatchEntry<T[]>,
	xs: T[],
	index: number,
	index1: number,
	schema: PatchSchemaArray<S, T>,
): Patches<T[]> => {
	const { op } = entry;
	if (op === PatchOp.Add) {
		if (!pred(entry.value)) {
			return schema.empty;
		}
	} else if (op === PatchOp.Remove) {
		if (!pred(xs[index])) {
			return schema.empty;
		}
	} else if (op === PatchOp.Replace) {
		const prev = pred(xs[index]);
		const next = pred(entry.value);
		if (prev !== next) {
			return schema.fromPatchEntries([
				{
					op: next ? PatchOp.Add : PatchOp.Remove,
					path: [index1],
					value: entry.value,
				},
			]);
		}
		if (!prev) {
			return schema.empty;
		}
	}
	return schema.fromPatchEntries([
		{
			...entry,
			path: [index1],
		},
	]);
};

export const filter = <T>(
	pred: (value: T) => boolean,
): IF<T[], [T[], number[]]> => {
	const csum = scan(
		(acc: number, value: T) => (pred(value) ? acc + 1 : acc),
		0,
	);

	const evaluateFilter = (xs: T[]): [T[], number[]] => [
		xs.filter(pred),
		csum.evaluate(xs),
	];

	const elemSchema = ps.atomic<T>();
	const inSchema = ps.array(elemSchema);
	const outSchema = inSchema satisfies PatchSchema<T[]>;
	const csumSchema = ps.array(ps.atomic<number>());
	const outTupleSchema = ps.tuple(outSchema, csumSchema) satisfies PatchSchema<
		[T[], number[]]
	>;

	const forwardFilterPatchEntry = (
		pred: (value: T) => boolean,
		csum: IF<T[], number[]>,
		xs: T[],
		entry: PatchSchemaArrayEntry<T>,
		cys: number[],
	): Patches<[T[], number[]]> | CannotReduce => {
		const index = entry.path[0] === IndexEnd ? xs.length : entry.path[0];
		const index1 = index === 0 ? 0 : cys[index - 1];

		let listPatches: Patches<T[]>;
		if ("inner" in entry) {
			listPatches = forwardFilterInternal(
				pred,
				xs,
				entry.inner,
				index,
				index1,
				elemSchema,
				outSchema,
			);
		} else {
			listPatches = forwardFilterSingleListOp(
				pred,
				entry,
				xs,
				index,
				index1,
				outSchema,
			);
		}
		const csumPatches: Patches<number[]> = csum.forward(
			xs,
			inSchema.fromEntries([entry]),
			cys,
		);

		return outTupleSchema.combine(
			outTupleSchema.liftIndex(0, listPatches),
			outTupleSchema.liftIndex(1, csumPatches),
		);
	};

	const forwardFilter = forwardWithArraySchema(
		inSchema,
		outTupleSchema,
		evaluateFilter,
		(xs1: T[], entry, [_ys1, cys1]: [T[], number[]]) =>
			forwardFilterPatchEntry(pred, csum, xs1, entry, cys1),
	);

	return {
		evaluate: evaluateFilter,
		forward: forwardFilter,
	};
};
