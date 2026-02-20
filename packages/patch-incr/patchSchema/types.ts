import type {
	ApplyCombine,
	ChangeBuilder,
	DRO,
	InferApplyType,
} from "../algebra";
import type {
	PatchAdd,
	PatchEntry,
	Patches,
	PatchRemove,
	PatchReplace,
	Targeted,
} from "../patch";

export interface PatchSchema<Value, Change = Patches<Value>>
	extends ApplyCombine<Value, Change> {
	fromPatchEntries(entry: PatchEntry<Value>[]): Change;
	// not optional
	builder: () => ChangeBuilder<Change>;
}

// biome-ignore lint/suspicious/noExplicitAny: needd for type constraints
export type AnyPatchSchema = PatchSchema<any, any>;

// biome-ignore lint/suspicious/noExplicitAny: needed for type constraints
export type AnyTuple = [] | [any, ...any[]];

// The following `satisfies` constraints
// const _a = [1, "test"] satisfies AnyTuple;
// const _b = ["test"] satisfies AnyTuple;
// const _c = [] satisfies AnyTuple;
// const _d = ["test"] as string[] /* satisfies AnyTuple fails */;

// biome-ignore lint/complexity/noBannedTypes: needed for type constraints
export type AnyRecord = {};

// biome-ignore lint/suspicious/noExplicitAny: needed for type constraints
export type AnyArray = any[];

export type InnerPatches<Object, Key extends keyof Object> = {
	[key in Key]?: { path: [key]; inner: Patches<Object[key]> };
};

export const IndexEnd = "-" as const;
export type IndexEnd = "-";

export type PatchSchemaArrayEntry<Elem> =
	| { path: [number]; inner: PatchEntry<Elem> }
	| (PatchRemove<[number]> & Targeted<Elem[]>)
	| (PatchAdd<[number | IndexEnd], Elem> & Targeted<Elem[]>)
	| (PatchReplace<[number], Elem> & Targeted<Elem[]>);

export interface PatchSchemaAtomic<Value> extends PatchSchema<Value> {
	analyze: (patches: Patches<Value>) => DRO<Value> | { inner: Patches<Value> };
}

export type TupleConstruction = AnyPatchSchema[];

export type InferTypeFromTupleConstruction<C extends TupleConstruction> =
	C extends []
		? []
		: C extends [
					infer Head extends AnyPatchSchema,
					...infer Tail extends TupleConstruction,
				]
			? [InferApplyType<Head>, ...InferTypeFromTupleConstruction<Tail>]
			: never;

export interface PatchSchemaTuple<
	C extends TupleConstruction,
	Tuple extends AnyTuple = InferTypeFromTupleConstruction<C>,
	Index extends keyof Tuple = keyof Tuple,
> extends PatchSchema<Tuple> {
	readonly $: C;
	readonly length: number;
	analyze: (patches: Patches<Tuple>) => DRO<Tuple> | InnerPatches<Tuple, Index>;
	liftIndex: <I extends Index>(
		index: I,
		change: Patches<Tuple[I]>,
	) => Patches<Tuple>;
}

export type RecordConstruction = Record<string, AnyPatchSchema>;

export type InferTypeFromRecordConstruction<C extends RecordConstruction> = {
	[key in string & keyof C]: InferApplyType<C[key]>;
};

export interface PatchSchemaRecord<
	C extends RecordConstruction,
	Record extends AnyRecord = InferTypeFromRecordConstruction<C>,
	Key extends string & keyof Record = string & keyof Record,
> extends PatchSchema<Record> {
	readonly $: C;
	analyze: (
		patches: Patches<Record>,
	) => DRO<Record> | InnerPatches<Record, Key>;
	liftKey: <K extends Key>(
		key: K,
		change: Patches<Record[K]>,
	) => Patches<Record>;
}

export interface PatchSchemaArray<
	S extends AnyPatchSchema,
	Elem = InferApplyType<S>,
> extends PatchSchema<Elem[]> {
	readonly $elem: S;
	analyze: (
		patches: Patches<Elem[]>,
	) => DRO<Elem[]> | PatchSchemaArrayEntry<Elem>[];
	fromEntries: (entries: PatchSchemaArrayEntry<Elem>[]) => Patches<Elem[]>;
	liftIndex: (index: number, change: Patches<Elem>) => Patches<Elem[]>;
}
