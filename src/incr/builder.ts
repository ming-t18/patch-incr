import {
	type PatchEntry,
	PatchOp,
	type Patches,
	type Targeted,
	applyPatches,
	liftPatch,
	replacePatch,
} from "./patch";
import type { IF, IFInv, NoForwardOutput, evaluate } from "./types";

const _identity = <T>(x: T) => x;

export const identity = <Input, Change = Patches<Input>>(): IFInv<
	Input,
	Input,
	Change,
	Change
> => {
	return {
		evaluate: _identity,
		inverseEvaluate: _identity,
		forward: (_1, d) => d,
	};
};

export const constant = <
	T,
	Input = unknown,
	InputChange = Patches<Input>,
	OutputChange = Patches<T>,
>(
	value: T,
	empty = [] as OutputChange,
): IF<Input, T, InputChange, OutputChange, NoForwardOutput> => {
	const forwardConstant = (_1: Input, _2: InputChange): OutputChange => empty;
	return {
		evaluate: (_: Input) => value,
		forward: forwardConstant,
	};
};

export const atomicFunc = <Input, Output>(
	evaluate: evaluate<Input, Output>,
): IF<Input, Output, Patches<Input>, Patches<Output>, NoForwardOutput> => {
	const forwardAtomicFunc = (input: Input, patches: Patches<Input>) => {
		if (patches.length === 0) {
			return [];
		}

		const newInput = applyPatches(input, patches);
		return replacePatch(evaluate(newInput));
	};
	return {
		evaluate,
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
	): Patches<Record<I, T>> => liftPatch(index, p),
	liftKey: <T, K extends string = string>(
		key: K,
		p: Patches<T>,
	): Patches<Record<K, T>> => liftPatch(key, p),
};
