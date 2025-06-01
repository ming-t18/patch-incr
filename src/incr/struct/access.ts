import {
	getReplaceOnly,
	isReplaceOnly,
	makeReplaceOnly,
} from "../../algebra/replaceOnly";
import { doAccess, filterAccessPatches } from "../../dual/access";
import * as ps from "../../patchSchema";
import type {
	InferTypeFromRecordConstruction,
	InferTypeFromTupleConstruction,
	PatchSchemaRecord,
	PatchSchemaTuple,
	RecordConstruction,
	TupleConstruction,
} from "../../patchSchema/types";
import {
	CannotReduce,
	PatchOp,
	type Patches,
	type Path,
	reducePatches,
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
	const invokeAccessRecord = (input: X): Y => input[key];
	const forwardAccessRecord = (_input: X, dx: Patches<X>, _?: Y) => {
		const res = schema.analyze(dx);
		if (res === null) {
			return schema.$[key].empty;
		}
		if (isReplaceOnly(res)) {
			return makeReplaceOnly(getReplaceOnly(res)[key]);
		}
		return res[key]?.inner ?? schema.$[key].empty;
	};
	return {
		invoke: invokeAccessRecord,
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
	const invokeAccessTuple = (input: X): Y => input[index];
	const forwardAccessTuple = (_input: X, dx: Patches<X>, _?: Y) => {
		const res = schema.analyze(dx);
		if (res === null) {
			return schema.$[index].empty;
		}
		if (isReplaceOnly(res)) {
			return makeReplaceOnly(getReplaceOnly(res)[index]);
		}
		return res[index]?.inner ?? schema.$[index].empty;
	};
	return {
		invoke: invokeAccessTuple,
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
): IF<Input, Output> => {
	const path = [key];
	const invoke = (input: Input) => doAccess(input, path) as never;
	return {
		invoke,
		// @ts-expect-error Can't be checked
		forward: (input, change, _output) => {
			return filterAccessPatches(path, input, change);
		},
	};
};

export const accessPath = <Output, Input>(
	pathPrefix: Path,
): IF<Input, Output> => {
	const invoke = (input: Input): Output => {
		let v: unknown = input;
		for (const elem of pathPrefix) {
			// @ts-expect-error avoid checking
			v = v[elem];
		}
		return v as never;
	};
	return {
		invoke,
		forward: reducePatches(invoke, (_input, entry, _output) => {
			const { path } = entry;
			if (path.length < pathPrefix.length) {
				return CannotReduce;
			}

			let match = true;
			for (let i = 0; i < pathPrefix.length; i++) {
				if (pathPrefix[i] === path[i]) {
					match = false;
					break;
				}
			}

			if (match) {
				if (entry.op === PatchOp.Replace && path.length === pathPrefix.length) {
					return CannotReduce;
				}

				return [
					{
						...entry,
						path: path.slice(1),
					},
				];
			}

			return [];
		}),
	};
};
