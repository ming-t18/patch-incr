import {
	CannotReduce,
	PatchBuilder,
	PatchOp,
	type Patches,
	type Path,
	applyPatches,
	combinePatches,
	liftPatch,
	reducePatches,
	replacePatch,
} from "./patch";
import { type IF, type InferIFOutput, type Invoke, isIF } from "./types";

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

export type InferRecordInput<Entries extends TupleOrRecord> = FirstArg<
	{
		[key in keyof Entries]: Entries[key] extends {
			// biome-ignore lint/suspicious/noExplicitAny: used in infer
			invoke: (arg: infer Input) => any;
		}
			? (_arg: Input) => unknown
			: never;
	}[keyof Entries]
>;

export type InferRecordOutput<Entries extends TupleOrRecord> = {
	[key in keyof Entries]: Entries[key] extends {
		// biome-ignore lint/suspicious/noExplicitAny: used in infer
		invoke: (...args: any[]) => infer Output;
	}
		? Output
		: Entries[key];
};

export const compose = <Input, Interm, Output>(
	f1: IF<Input, Interm>,
	f2: IF<Interm, Output>,
): IF<Input, [Output, Interm]> => {
	return {
		invoke: (x) => {
			const v = f1.invoke(x);
			return [f2.invoke(v), v];
		},
		forward: (input, change, [y, v]) => {
			const dv = f1.forward(input, change, v);
			const dy = f2.forward(v, dv, y);
			return combinePatches(liftPatch(0, dy), liftPatch(1, dv));
		},
	};
};

export const record = <Input, Entries extends TupleOrRecord>(
	entries: Entries,
	_inferInput?: ((x: Input) => unknown) | undefined,
): IF<Input, InferRecordOutput<Entries>> => {
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
			o[key] = isIF(v) ? v.invoke(input) : v;
		}
		// @ts-expect-error Can't be checked
		return o;
	};

	return {
		invoke,
		forward: (input, change, output) => {
			const outChange: Patches = [];
			for (const key of keys) {
				// @ts-expect-error Can't be checked
				const v = entries[key] as unknown;
				if (!isIF(v)) {
					continue;
				}

				// @ts-expect-error Can't be checked
				const outV = output[key] as never;
				outChange.push(...liftPatch(key, v.forward(input, change, outV)));
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
	const invoke = (input: Input) => input[key];
	return {
		invoke,
		// @ts-expect-error Can't be checked
		forward: reducePatches(invoke, (_input, entry, _output) => {
			const { path } = entry;
			if (path.length === 0) {
				return CannotReduce;
			}

			if (path[0] === key) {
				if (entry.op === PatchOp.Replace && path.length === 1) {
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

export type DepsList = number[];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type IFGraphEdges = [DepsList, IF<any[], any>][];

export type IFGraphNodeDef<Deps extends DepsList = [], Output = unknown> = {
	deps: DepsList;
	output: Output;
};

interface IFGraph<Input, Def extends IFGraphNodeDef[] = IFGraphNodeDef[]> {
	edges: IFGraphEdges;
	__$input?: (arg: Input) => void;
	__$def?: Def;
}

export const fromGraph = <
	Input,
	Graph extends IFGraph<Input> = IFGraph<Input>,
>({
	edges,
}: Graph): IF<Input, unknown[]> => {
	return {
		invoke: (input) => {
			const data: unknown[] = [];
			for (const [deps, func] of edges) {
				const fromDeps = deps.map((i) => data[i]);
				data.push(func.invoke([input, ...fromDeps]));
			}
			return data;
		},
		forward: (input, changes, output) => {
			const patches = PatchBuilder.empty();
			const depChanges: Patches[] = [];
			let i = 0;
			for (const [deps, func] of edges) {
				const fromDeps = deps.map((i) => output[i]);
				const input1 = [input, ...fromDeps];
				const changes1 = PatchBuilder.empty();
				changes1.concat(liftPatch(0, changes));
				for (const iDep of deps) {
					changes1.concat(liftPatch(iDep + 1, depChanges[iDep]));
				}
				const newDepChanges = func.forward(input1, changes1.build(), output[i]);
				depChanges.push(newDepChanges);
				patches.concat(liftPatch(i, newDepChanges));
				i++;
			}
			return patches.build();
		},
	};
};

export type InferArgs<
	Def extends IFGraphNodeDef[],
	Deps extends DepsList,
> = Deps extends []
	? []
	: // biome-ignore lint/suspicious/noExplicitAny: <explanation>
		[number, ...any[]] extends Deps
		? [
				{
					$FailedToInferDepsList: "`as const` is required for deps list";
					$InferArgs: [Def, Deps];
				},
			]
		: Deps extends [infer N extends number, ...infer Rest extends DepsList]
			? [Def[N]["output"], ...InferArgs<Def, Rest>]
			: [
					{
						$FailedToInferDepsList: "deps must be a list of number with `as const`";
						$InferArgs: [Def, Deps];
					},
				];

export type InferBuildOutput<Def extends IFGraphNodeDef[]> = Def extends []
	? []
	: Def extends [{ output: infer Out }, ...infer Rest extends IFGraphNodeDef[]]
		? [Out, ...InferBuildOutput<Rest>]
		: never;

export class IFGraphBuilder<Input, Def extends IFGraphNodeDef[]> {
	private declare readonly __$input: (arg: Input) => void;
	private readonly edges: IFGraphEdges;
	private constructor(edges: IFGraphEdges) {
		this.edges = edges;
	}

	static empty<Input>(): IFGraphBuilder<Input, []> {
		return new IFGraphBuilder([]);
	}

	add<Deps extends DepsList, Output>(
		deps: Deps,
		func: IF<
			[Input, ...InferArgs<Def, Deps>],
			Output,
			Patches<[Input, ...InferArgs<Def, Deps>]>,
			Patches<Output>
		>,
	): IFGraphBuilder<Input, [...Def, IFGraphNodeDef<Deps, Output>]> {
		return new IFGraphBuilder([...this.edges, [deps, func as never]]);
	}

	build() {
		return fromGraph({ edges: this.edges }) as never as IF<
			Input,
			InferBuildOutput<Def>
		>;
	}
}
