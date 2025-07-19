import type { Patches } from "../../patch";
import type {
	InferTypeFromTupleConstruction,
	PatchSchemaTuple,
	TupleConstruction,
} from "../../patchSchema/types";
import type { IF } from "../../types";

export const tupleWithSchema = <Input, C extends TupleConstruction>(
	entries: { [k in keyof C]: IF<Input, C[k]> },
	outSchema: PatchSchemaTuple<C, InferTypeFromTupleConstruction<C>>,
): IF<Input, InferTypeFromTupleConstruction<C>> => {
	type Tuple = InferTypeFromTupleConstruction<C>;
	type Key = keyof Tuple;
	const keys: Key[] = Array(entries.length)
		.fill(null)
		.map((_, i) => i) as never[];
	const evaluate = (input: Input): Tuple =>
		keys.map((key) => entries[key as never].evaluate(input)) as Tuple;

	return {
		evaluate,
		forward: (input: Input, change: Patches<Input>, output: Tuple) => {
			const builder = outSchema.builder();
			for (const key of keys) {
				const outV = output[key];
				const dv: Patches<Tuple[Key]> = entries[key as never].forward(
					input,
					change,
					outV as never,
				) as Patches<never>;
				builder.append(outSchema.liftIndex(key, dv));
			}
			return builder.build();
		},
	};
};
