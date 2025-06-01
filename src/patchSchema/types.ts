import type {
	ApplyCombine,
	DRO,
	InferApplyType,
	ReplaceOnly,
} from "../algebra";
import type {
	PatchAdd,
	PatchEntry,
	PatchRemove,
	PatchReplace,
	Patches,
} from "../incr/patch";

export interface PatchSchema<Value, Change = Patches<Value>>
	extends ApplyCombine<Value, Change> {}

// biome-ignore lint/suspicious/noExplicitAny: needd for type constraints
export type AnyPatchSchema = PatchSchema<any, any>;

// biome-ignore lint/suspicious/noExplicitAny: needed for type constraints
export type AnyTuple = any[];

// biome-ignore lint/complexity/noBannedTypes: needed for type constraints
export type AnyRecord = {};

export type InnerPatches<Object, Key extends keyof Object> = {
	[key in Key]?: { path: [key]; inner: Patches<Object[key]> };
};

export const IndexEnd = "-" as const;
export type IndexEnd = "-";

export type PatchSchemaArrayEntry<Elem> =
	| { path: [number]; inner: PatchEntry<Elem> }
	| PatchRemove<[number]>
	| PatchAdd<Elem, [number | IndexEnd]>
	| PatchReplace<Elem, [number]>;

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
	liftIndex: (index: number, change: Patches<Elem>) => Patches<Elem[]>;
}
