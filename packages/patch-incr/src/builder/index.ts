import {
	applyPatches,
	liftPatches,
	type PatchEntry,
	type Patches,
	PatchOp,
	replacePatches,
	type Targeted,
} from "../patch";
import type { AnyIF, Evaluate, HasForwardOutput, IF, IFInv } from "../types";

/**
 * Placeholder for type checking by checking the inferred type params. Throws an exception when called.
 *
 * Similar to the `_` expression for type checking holes.
 */
export const hole = <Input, Output>(): IF<Input, Output> => {
	throw new Error("error: hole");
};

export const holeInv = <Input, Output>(): IFInv<Input, Output> => {
	throw new Error("error: holeInv");
};

export const castOutput = <
	Input,
	Output extends Super,
	Super,
	DInput = Patches<Input>,
	F extends boolean = HasForwardOutput,
>(
	func: IF<Input, Output, DInput, Patches<Output>, F>,
): IF<Input, Super, DInput, Patches<Super>, F> => func as AnyIF;

export { constant } from "./constant";

export const atomicFunc = <Input, Output>(
	evaluate: Evaluate<Input, Output>,
): IF<Input, Output, Patches<Input>, Patches<Output>> => {
	const forwardAtomicFunc = (
		input: Input,
		patches: Patches<Input>,
		output: Output,
	): Patches<Output> => {
		if (patches.length === 0) {
			return [];
		}

		const newInput = applyPatches(input, patches);
		const newOutput = evaluate(newInput);
		if (Object.is(newOutput, output)) {
			return [];
		}
		return replacePatches(newOutput);
	};
	return {
		evaluate,
		forward: forwardAtomicFunc,
	};
};

export const atomicFuncInv = <Input, Output>(
	evaluate: Evaluate<Input, Output>,
	inverseEvaluate: Evaluate<Output, Input>,
): IFInv<Input, Output, Patches<Input>, Patches<Output>> => {
	const forwardAtomicFunc = (
		input: Input,
		patches: Patches<Input>,
		output?: Output,
	): Patches<Output> => {
		if (patches.length === 0) {
			return [];
		}

		const newInput = applyPatches(input, patches);
		const newOutput = evaluate(newInput);
		if (output !== undefined && Object.is(newOutput, output)) {
			return [];
		}
		return replacePatches(newOutput);
	};
	return {
		evaluate,
		inverseEvaluate,
		forward: forwardAtomicFunc,
	};
};

// biome-ignore lint/suspicious/noExplicitAny: used in infer
export type FirstArg<T> = T extends (v: infer Arg, ...args: any[]) => any
	? Arg
	: never;

// biome-ignore lint/suspicious/noExplicitAny: PatchEntry
export interface StructuralChangeBuilder<Obj = unknown, P = PatchEntry<any>[]> {
	fromReplace: <R extends Obj>(value: R) => P & Targeted<R>;
	readonly empty: P & Targeted<Obj>;
	liftIndex: <R extends Obj, I extends number>(
		index: I,
		patch: P & Targeted<R>,
	) => P & Targeted<Record<I, R>>;
	liftKey: <R extends Obj, K extends string>(
		key: K,
		patch: P & Targeted<R>,
	) => P & Targeted<Record<K, R>>;
	combine: <R extends Obj>(
		a: P & Targeted<R>,
		b: P & Targeted<R>,
	) => P & Targeted<R>;
}

// biome-ignore lint/suspicious/noExplicitAny: Patch type
export const patchesBuilder: StructuralChangeBuilder<any, Patches> = {
	fromReplace: <T>(value: T): Patches<T> => [
		{ op: PatchOp.Replace, path: [], value },
	],
	empty: Object.freeze([]) as never,
	combine: <T>(a: Patches<T>, b: Patches<T>): Patches<T> => [...a, ...b],
	liftIndex: <T, I extends number = number>(
		index: I,
		p: Patches<T>,
	): Patches<Record<I, T>> => liftPatches(index, p),
	liftKey: <T, K extends string = string>(
		key: K,
		p: Patches<T>,
	): Patches<Record<K, T>> => liftPatches(key, p),
};

export { identity } from "./identity";
export { recurse } from "./recurse";
export { singleton } from "./tuple";
