import type { AnyIF, IF, NoForwardOutput } from "@/types";
import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import { HINT_TRIVIAL } from "../../hints";
import {
	applyGet,
	applyPatches,
	type Patches,
	type Path,
	replacePatches,
} from "../../patch";
import { applyGetOpt } from "../../patch/access";
import { projectPatches } from "../../patch/helpers";
import type {
	InferTypeFromRecordConstruction,
	InferTypeFromTupleConstruction,
	PatchSchemaRecord,
	PatchSchemaTuple,
	RecordConstruction,
	TupleConstruction,
} from "../../patchSchema/types";
import { getTrackedPath, trackedProxy } from "../../tracked";
import { identity } from "..";
import type { AccessPath, AccessPathOpt } from "../typeHelpers";

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
		prevValueOpt?: Output,
	): Patches<Output> => {
		const res: Patches<Output> | null = projectPatches(key, change);
		if (res !== null) {
			return res;
		}
		const newValue = evaluateAccess(applyPatches(input, change));
		if (prevValueOpt !== undefined && Object.is(prevValueOpt, newValue)) {
			return [];
		}

		return replacePatches(newValue);
	};
	return {
		evaluate: evaluateAccess,
		forward: forwardAccess,
		hints: HINT_TRIVIAL,
	};
};

export const accessFor = <Input>(): (<
	Key extends keyof Input & (string | number),
	Output = AccessPath<Input, [Key]>,
>(
	key: Key,
) => IF<Input, Output, Patches<Input>, Patches<Output>, NoForwardOutput>) =>
	access as never;

export const accessPath = <Output, Input extends WeakKey>(
	path: Path,
): IF<Input, Output> => {
	if (path.length === 0) {
		return identity() as AnyIF;
	}

	const evaluateAccessPath = (input: Input): Output => applyGet(input, path);
	const forwardAccessPath = (
		input: Input,
		change: Patches<Input>,
		prevValueOpt?: Output,
	): Patches<Output> => {
		const res: Patches<Output> | null = projectPatches(path, change);
		if (res !== null) {
			return res;
		}
		const newValue = evaluateAccessPath(applyPatches(input, change));
		if (prevValueOpt !== undefined && Object.is(prevValueOpt, newValue)) {
			return [];
		}

		return replacePatches(newValue);
	};
	return {
		evaluate: evaluateAccessPath,
		forward: forwardAccessPath,
		hints: HINT_TRIVIAL,
	};
};

export const accessPathFor = <Input>(): (<
	P extends Path,
	Output = AccessPath<Input, P>,
>(
	path: Path,
) => IF<Input, Output, Patches<Input>, Patches<Output>, NoForwardOutput>) =>
	accessPath as never;

export const accessPathOpt = <Output, Input extends WeakKey>(
	path: Path,
): IF<Input, Output | undefined> => {
	if (path.length === 0) {
		return identity() as AnyIF;
	}

	const evaluateAccessPathOpt = (input: Input): Output | undefined =>
		applyGetOpt(input, path);
	const forwardAccessPathOpt = (
		input: Input,
		change: Patches<Input>,
		_ignored?: Output | undefined,
	): Patches<Output | undefined> => {
		const prevValue = evaluateAccessPathOpt(input);
		let res: Patches<Output | undefined> | null = null;
		if (prevValue !== undefined) {
			res = projectPatches(path, change);
		}
		if (res !== null) {
			return res;
		}

		const nextValue = evaluateAccessPathOpt(applyPatches(input, change));
		return Object.is(prevValue, nextValue) ? [] : replacePatches(nextValue);
	};
	return {
		evaluate: evaluateAccessPathOpt,
		forward: forwardAccessPathOpt,
		hints: HINT_TRIVIAL,
	};
};

export const accessPathOptFor = <Input>(): (<
	P extends Path,
	Output = AccessPathOpt<Input, P>,
>(
	path: [...P],
) => IF<
	Input,
	Output | undefined,
	Patches<Input>,
	Patches<Output | undefined>,
	NoForwardOutput
>) => accessPathOpt as never;

export const accessWith = <Output, Input extends WeakKey>(
	pathBuilder: (input: Input) => Output,
): IF<Input, Output> => {
	const path: Path = getTrackedPath(pathBuilder(trackedProxy())) as never[];
	return accessPath<Output, Input>(path);
};

export const accessWithFor = <Input>(): (<Output>(
	pathBuilder: (input: Input) => Output,
) => IF<Input, Output>) => accessWith as never;
