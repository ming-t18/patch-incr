import { PatchBuilder, type Patches, liftPatch } from "./patch";
import type { IF } from "./types";

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
		evaluate: (input) => {
			const data: unknown[] = [];
			for (const [deps, func] of edges) {
				const fromDeps = deps.map((i) => data[i]);
				data.push(func.evaluate([input, ...fromDeps]));
			}
			return data;
		},
		forward: (input: Input, changes: Patches<Input>, output: unknown[]) => {
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
