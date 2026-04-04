import { PatchOp } from "@/types";
import { PatchSchemaArrayImpl } from "./array";
import { PatchSchemaAtomicImpl } from "./atomic";
import { PatchSchemaMappingImpl } from "./mapping";
import { PatchSchemaRecordImpl } from "./record";
import { PatchSchemaTupleImpl } from "./tuple";
import {
	type AnyPatchSchema,
	IndexEnd,
	type PatchSchema,
	type PatchSchemaArray,
	type PatchSchemaArrayEntry,
	type PatchSchemaMapping,
	type PatchSchemaRecord,
	type PatchSchemaReplaceOnly,
	type PatchSchemaTuple,
	type RecordConstruction,
	type TupleConstruction,
} from "./types";

export const mapArrayPatchIndex = <T = unknown>(
	xs: Pick<T[], "length">,
	entry: PatchSchemaArrayEntry<T>,
) =>
	"inner" in entry
		? entry.path[0]
		: entry.path[0] === IndexEnd
			? entry.op === PatchOp.Remove
				? xs.length - 1
				: xs.length
			: entry.path[0];

// TODO technically PatchSchemaReplaceOnlyImpl should exist
export const replaceOnly = <T>(): PatchSchemaReplaceOnly<T> =>
	PatchSchemaAtomicImpl.INSTANCE as PatchSchemaReplaceOnly<T>;

export const atomic = <T>(): PatchSchema<T> =>
	PatchSchemaAtomicImpl.INSTANCE as PatchSchema<T>;
export const array = <S extends AnyPatchSchema>(
	schema: S,
): PatchSchemaArray<S> => new PatchSchemaArrayImpl(schema);
export const tuple = <C extends TupleConstruction>(
	...construction: C
): PatchSchemaTuple<C> => new PatchSchemaTupleImpl(construction);
export const record = <C extends RecordConstruction>(
	construction: C,
): PatchSchemaRecord<C> => new PatchSchemaRecordImpl(construction);
export const mapping = <
	Key extends string,
	Value,
	KS extends PatchSchemaReplaceOnly<Key> = PatchSchemaReplaceOnly<Key>,
	VS extends PatchSchema<Value> = PatchSchema<Value>,
>(
	key: KS,
	value: VS,
): PatchSchemaMapping<Key, Value, KS, VS> =>
	new PatchSchemaMappingImpl<Key, Value, KS, VS>(key, value);
