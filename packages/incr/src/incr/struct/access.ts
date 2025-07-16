import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import type {
	InferTypeFromRecordConstruction,
	InferTypeFromTupleConstruction,
	PatchSchemaRecord,
	PatchSchemaTuple,
	RecordConstruction,
	TupleConstruction,
} from "../../patchSchema/types";
import { composeMemoL } from "../compose/memo";
import {
	applyPatches,
	type PatchEntry,
	type Patches,
	type Path,
	replacePatch,
} from "../patch";
import type { IF, NoForwardOutput } from "../types";

export const accessRecord = <
	C extends RecordConstruction,
	K extends string & keyof C = string & keyof C,
>(
	key: K,
	schema: PatchSchemaRecord<C>,
): IF<
	InferTypeFromRecordConstruction<C>,
	InferTypeFromRecordConstruction<C>[K],
	Patches<InferTypeFromRecordConstruction<C>>,
	Patches<InferTypeFromRecordConstruction<C>[K]>,
	NoForwardOutput
> => {
	type X = InferTypeFromRecordConstruction<C>;
	type Y = InferTypeFromRecordConstruction<C>[K];
	const evaluateAccessRecord = (input: X): Y => input[key];
	const forwardAccessRecord = (
		_input: X,
		dx: Patches<X>,
		_?: Y,
	): Patches<Y> => {
		const res = schema.analyze(dx);
		if (res === null) {
			return schema.$[key].empty;
		}
		if (isReplaceOnly(res)) {
			return schema.$[key].fromReplace(getReplaceOnly(res)[key]);
		}
		return res[key]?.inner ?? schema.$[key].empty;
	};
	return {
		evaluate: evaluateAccessRecord,
		forward: forwardAccessRecord,
	};
};

export const accessTuple = <
	C extends TupleConstruction,
	K extends number & keyof C = number & keyof C,
>(
	index: K,
	schema: PatchSchemaTuple<C>,
): IF<
	InferTypeFromTupleConstruction<C>,
	InferTypeFromTupleConstruction<C>[K],
	Patches<InferTypeFromTupleConstruction<C>>,
	Patches<InferTypeFromTupleConstruction<C>[K]>,
	NoForwardOutput
> => {
	type X = InferTypeFromTupleConstruction<C>;
	type Y = InferTypeFromTupleConstruction<C>[K];
	const evaluateAccessTuple = (input: X): Y => input[index];
	const forwardAccessTuple = (_input: X, dx: Patches<X>, _?: Y): Patches<Y> => {
		const res = schema.analyze(dx);
		if (res === null) {
			return schema.$[index].empty;
		}
		if (isReplaceOnly(res)) {
			return schema.$[index].fromReplace(getReplaceOnly(res)[index]);
		}
		return res[index]?.inner ?? schema.$[index].empty;
	};
	return {
		evaluate: evaluateAccessTuple,
		forward: forwardAccessTuple,
	};
};

export const access = <
	Output,
	Key extends string | number,
	Input extends {
		[key in Key]: Output;
	} = {
		[key in Key]: Output;
	},
>(
	key: Key,
): IF<Input, Output, Patches<Input>, Patches<Output>, NoForwardOutput> => {
	const evaluateAccess = (input: Input) => input[key];
	const forwardAccess = (
		input: Input,
		change: Patches<Input>,
		_ignored?: Output,
	): Patches<Output> => {
		const res = [] as Patches<Output>;
		for (const entry of change) {
			const { path } = entry;
			if (path.length === 0) {
				const updated = applyPatches(input, change);
				return replacePatch(evaluateAccess(updated));
			}

			const [head, ...rest] = path;
			if (head === key) {
				res.push({
					...entry,
					path: rest,
				} as PatchEntry<Output>);
			}
		}

		return res;
	};
	return {
		evaluate: evaluateAccess,
		forward: forwardAccess,
	};
};

export const accessPath = <Output, Input extends WeakKey>(
	path: Path,
): IF<Input, Output> => {
	if (path.length === 0) {
		throw new Error("accessPath: cannot be empty path");
	}

	if (path.length === 1) {
		// @ts-expect-error Can't be checked
		return access(path[0]);
	}

	// @ts-expect-error Can't be checked
	return composeMemoL(access(path[0]), accessPath(path.slice(1)));
};
