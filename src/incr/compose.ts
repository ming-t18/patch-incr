import { type StructuralChangeBuilder, patchesBuilder } from "./builder";
import type { Patches } from "./patch";
import type { IF, IFInv } from "./types";

export const compose = <
	Input,
	Interm,
	Output,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
	ComposeOutputChange = Patches<[Output, Interm]>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
	outBuilder = patchesBuilder as never as StructuralChangeBuilder<
		unknown,
		IntermChange | OutputChange
	>,
): IF<Input, [Output, Interm], InputChange, ComposeOutputChange> => {
	return {
		invoke: (x: Input): [Output, Interm] => {
			const v = f1.invoke(x);
			return [f2.invoke(v), v];
		},
		forward: (input, change, [y, v]): ComposeOutputChange => {
			const dv = f1.forward(input, change, v);
			const dy = f2.forward(v, dv, y);
			return outBuilder.combine(
				outBuilder.liftIndex(0, dy as never) as never,
				outBuilder.liftIndex(1, dv as never) as never,
			) as ComposeOutputChange;
		},
	};
};

export const composeNoInterm = <
	Input,
	Interm,
	Output,
	InputChange = Patches<Input>,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IFInv<Interm, Output, IntermChange, OutputChange>,
): IF<Input, Output, InputChange, OutputChange> => {
	return {
		invoke: (x) => f2.invoke(f1.invoke(x)),
		forward: (input, change, y): OutputChange => {
			const v: Interm = f2.inverseInvoke(y);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};
