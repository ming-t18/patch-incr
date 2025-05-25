import { PatchSchemaArrayImpl } from "./array";
import { PatchSchemaAtomicImpl } from "./atomic";
import { PatchSchemaRecordImpl } from "./record";
import { PatchSchemaTupleImpl } from "./tuple";
import type {
	AnyPatchSchema,
	PatchSchema,
	PatchSchemaArray,
	PatchSchemaRecord,
	PatchSchemaTuple,
	RecordConstruction,
	TupleConstruction,
} from "./types";

export const atomic = <T>(): PatchSchema<T> => new PatchSchemaAtomicImpl<T>();
export const array = <S extends AnyPatchSchema>(
	schema: S,
): PatchSchemaArray<S> => new PatchSchemaArrayImpl(schema);
export const tuple = <C extends TupleConstruction>(
	...construction: C
): PatchSchemaTuple<C> => new PatchSchemaTupleImpl(construction);
export const record = <C extends RecordConstruction>(
	construction: C,
): PatchSchemaRecord<C> => new PatchSchemaRecordImpl(construction);
