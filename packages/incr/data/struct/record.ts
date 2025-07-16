import type { Patches } from "../../patch";
import type {
	InferTypeFromRecordConstruction,
	PatchSchemaRecord,
	RecordConstruction,
} from "../../patchSchema/types";
import { type IF, isIF } from "../../types";
import { patchesBuilder, type StructuralChangeBuilder } from "../builder";
import type {
	InferRecordInput,
	InferRecordOutput,
	TupleOrRecord,
} from "./types";

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
	const evaluate = (input: Input): InferRecordOutput<Entries> => {
		// @ts-expect-error Can't be checked
		const o: Record<string | number, unknown> = isTuple ? [] : {};
		for (const key of keys) {
			// @ts-expect-error Can't be checked
			const v = entries[key] as unknown;
			o[key] = isIF<Input, unknown, InputChange>(v) ? v.evaluate(input) : v;
		}
		// @ts-expect-error Can't be checked
		return o;
	};

	return {
		evaluate,
		forward: (
			input: Input,
			change: InputChange,
			output: InferRecordOutput<Entries>,
		) => {
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

export const recordWithSchema = <Input, C extends RecordConstruction>(
	entries: { [k in keyof C]: IF<Input, C[k]> },
	outSchema: PatchSchemaRecord<C, InferTypeFromRecordConstruction<C>>,
): IF<Input, InferTypeFromRecordConstruction<C>> => {
	type Record = InferTypeFromRecordConstruction<C>;
	type Key = keyof Record;
	const keys: Key[] = Object.keys(entries as never);
	const evaluate = (input: Input): Record => {
		const o: Record = {} as never;
		for (const key of keys) {
			o[key] = entries[key].evaluate(input);
		}
		return o;
	};

	return {
		evaluate,
		forward: (input: Input, change: Patches<Input>, output: Record) => {
			const builder = outSchema.builder();
			for (const key of keys) {
				const outV = output[key];
				const dv = entries[key].forward(input, change, outV as never);
				builder.append(outSchema.liftKey(key, dv));
			}
			return builder.build();
		},
	};
};
