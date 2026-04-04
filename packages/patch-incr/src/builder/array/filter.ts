import {
	type ArrayPatchReducer,
	reduceArrayPatchesGeneric,
} from "@/algebra/arrayPatch";
import type { Evaluate, Forward, IF } from "@/types";
import type { PatchEntry, Patches } from "../../patch";
import * as ps from "../../patchSchema";
import { mapArrayPatchIndex } from "../../patchSchema";
import {
	IndexEnd,
	type PatchSchema,
	type PatchSchemaArray,
	type PatchSchemaArrayEntry,
	type PatchSchemaTuple,
	type TupleConstruction,
} from "../../patchSchema/types";
import { composeMemo } from "../compose";
import { fst } from "../pair";
import { scan } from "./scan";

const makeFilterReducer = <T, S extends PatchSchema<T>>(
	pred: (value: T) => boolean,
	valueSchema: PatchSchema<T>,
	outArraySchema: PatchSchemaArray<S, T>,
): ArrayPatchReducer<
	T,
	[value: T, indexMapped: number],
	PatchEntry<T>,
	Patches<T[]>
> => {
	return {
		apply: (
			_index: number,
			change: PatchEntry<T>,
			value: T,
			index1: number,
		): Patches<T[]> => {
			const dInner = valueSchema.fromPatchEntries([change]);
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
				return outArraySchema.remove(index1);
			}

			// !prev && next
			return outArraySchema.add(index1, valueUpdated);
		},
		add: (
			index: number | IndexEnd,
			addValue: T,
			_prev: T,
			indexMapped: number,
		): Patches<T[]> => {
			return pred(addValue)
				? outArraySchema.add(
						index === IndexEnd ? IndexEnd : indexMapped,
						addValue,
					)
				: outArraySchema.empty;
		},
		replace: (
			_index: number,
			nextValue: T,
			prevValue: T,
			indexMapped: number,
		): Patches<T[]> => {
			const prev = pred(prevValue);
			const next = pred(nextValue);
			if (prev !== next) {
				return next
					? outArraySchema.add(indexMapped, nextValue)
					: outArraySchema.remove(indexMapped);
			}

			return next
				? outArraySchema.replace(indexMapped, nextValue)
				: outArraySchema.empty;
		},
		remove: (
			index: number | IndexEnd,
			value: T,
			indexMapped: number,
		): Patches<T[]> => {
			return pred(value)
				? outArraySchema.remove(index === IndexEnd ? IndexEnd : indexMapped)
				: outArraySchema.empty;
		},
	};
};

const makeForwardFilter = <
	T,
	SIn extends PatchSchema<T>,
	SOut extends PatchSchema<T>,
	C extends TupleConstruction,
>(
	evaluate: Evaluate<T[], [T[], number[]]>,
	pred: (value: T) => boolean,
	forwardCsum: Forward<T[], number[]>,
	valueSchema: PatchSchema<T>,
	inArraySchema: PatchSchemaArray<SIn, T>,
	outArraySchema: PatchSchemaArray<SOut, T>,
	outSchema: PatchSchemaTuple<C, [T[], number[]]>,
) => {
	type FilterResult = [T[], number[]];
	type State = { xs: T[]; y: FilterResult };
	return reduceArrayPatchesGeneric<
		T,
		FilterResult,
		[value: T, indexMapped: number],
		State,
		Patches<T[]>
	>({
		reducer: makeFilterReducer(pred, valueSchema, outArraySchema),
		evaluate,
		stateToArgs: (
			entry: PatchSchemaArrayEntry<T>,
			{ xs, y: [_, csum] }: State,
		): [value: T, indexMapped: number] => {
			const index = mapArrayPatchIndex(xs, entry);
			const indexMapped: number = index === 0 ? 0 : csum[index - 1];
			return [xs[index], indexMapped];
		},
		getInitial: (xs: T[], _dxs: Patches<T[]>, y: FilterResult): State => ({
			xs,
			y,
		}),
		stateReducer: (
			{ xs, y }: State,
			entry: PatchSchemaArrayEntry<T>,
			dFiltered: Patches<T[]>,
		): [Patches<FilterResult>, State] => {
			const [_, csum] = y;
			const dxs = inArraySchema.fromEntries([entry]);
			const dcsum: Patches<number[]> = forwardCsum(xs, dxs, csum);
			const dy: Patches<FilterResult> = outSchema.combine(
				outSchema.liftIndex(0, dFiltered),
				outSchema.liftIndex(1, dcsum),
			);
			return [
				dy,
				{
					xs: inArraySchema.apply(xs, dxs),
					y: outSchema.apply(y, dy),
				},
			];
		},
	});
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
	return {
		evaluate: evaluateFilter,
		forward: makeForwardFilter(
			evaluateFilter,
			pred,
			csum.forward,
			elemSchema,
			inSchema,
			outSchema,
			outTupleSchema,
		),
	};
};

export const filterSingle = <T>(pred: (value: T) => boolean) =>
	composeMemo(filter(pred), fst());
