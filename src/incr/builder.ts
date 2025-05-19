import { doAccess, filterAccessPatches } from "../dual/access";
import {
	CannotReduce,
	PatchBuilder,
	PatchOp,
	type Patches,
	type Path,
	type Targeted,
	applyPatches,
	liftPatch,
	reducePatches,
	replacePatch,
} from "./patch";
import { type IF, type Invoke, isIF } from "./types";

const _identity = <T>(x: T) => x;

export const identity = <Input>(): IF<Input, Input> => {
	return {
		invoke: _identity,
		forward: (_1, d, _2) => d,
	};
};

export const constant = <T, Input = unknown>(value: T): IF<Input, T> => {
	return {
		invoke: (_: Input) => value,
		forward: (_1, _2, _3) => [],
	};
};

export const atomicFunc = <Input, Output>(
	invoke: Invoke<Input, Output>,
): IF<Input, Output> => {
	return {
		invoke,
		forward: (input, patches, output) => {
			const newInput = applyPatches(input, patches);
			const updated = invoke(newInput);
			return output === updated ? [] : replacePatch(updated);
		},
	};
};

export type TupleOrRecord<T = unknown> = Record<string, unknown> | T[];

export type InferOutput<T> = T extends {
	// biome-ignore lint/suspicious/noExplicitAny: used in infer
	invoke: (...args: any[]) => infer Output;
}
	? Output
	: "FAILED_TO_INFER_OUTPUT";

// biome-ignore lint/suspicious/noExplicitAny: used in infer
export type FirstArg<T> = T extends (v: infer Arg, ...args: any[]) => any
	? Arg
	: never;

export type InferRecordInput<Entries extends TupleOrRecord> = {
	[key in keyof Entries]: Entries[key] extends {
		// biome-ignore lint/suspicious/noExplicitAny: used in infer
		invoke: (arg: infer Input) => any;
	}
		? Input
		: never;
}[keyof Entries];

export type InferRecordOutput<Entries extends TupleOrRecord> = {
	[key in keyof Entries]: Entries[key] extends {
		// biome-ignore lint/suspicious/noExplicitAny: used in infer
		invoke: (...args: any[]) => infer Output;
	}
		? Output
		: Entries[key];
};

export interface StructuralChangeBuilder<Obj = unknown, P = Patches> {
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

export const patchesBuilder: StructuralChangeBuilder<unknown & never, Patches> =
	{
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

export const record = <
	Entries extends TupleOrRecord,
	Input = InferRecordInput<Entries>,
	InputChange = Patches<Input>,
	OutputChange = Patches<InferRecordOutput<Entries>>,
>(
	entries: Entries,
	outBuilder = patchesBuilder as never as StructuralChangeBuilder<
		unknown,
		OutputChange
	>,
): IF<Input, InferRecordOutput<Entries>, InputChange, OutputChange> => {
	const isTuple = Array.isArray(entries);
	const keys = isTuple
		? Array(entries.length)
				.fill(null)
				.map((_, i) => i)
		: Object.keys(entries);
	const invoke = (input: Input): InferRecordOutput<Entries> => {
		// @ts-expect-error Can't be checked
		const o: Record<string | number, unknown> = isTuple ? [] : {};
		for (const key of keys) {
			// @ts-expect-error Can't be checked
			const v = entries[key] as unknown;
			o[key] = isIF<Input, unknown, InputChange>(v) ? v.invoke(input) : v;
		}
		// @ts-expect-error Can't be checked
		return o;
	};

	return {
		invoke,
		forward: (input: Input, change: InputChange, output) => {
			let outChange: OutputChange = outBuilder.empty;
			for (const key of keys) {
				// @ts-expect-error Can't be checked
				const v = entries[key] as unknown;
				if (!isIF<Input, unknown, InputChange>(v)) {
					continue;
				}

				// @ts-expect-error Can't be checked
				const outV = output[key] as never;
				const dv = v.forward(input, change, outV) as never;
				outChange = outBuilder.combine(
					outChange as never,
					isTuple
						? outBuilder.liftIndex(key as number, dv)
						: outBuilder.liftKey(key as string, dv),
				);
			}
			return outChange;
		},
	};
};

export const access = <
	Output,
	Key extends string | number,
	Input extends { [key in Key]: Output },
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
