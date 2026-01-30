import type { Patches } from "../../patch";
import type { IF } from "../../types";

export const composeReeval = <
	Input,
	Interm,
	Output,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
): IF<Input, Output, InputChange, OutputChange> => {
	return {
		evaluate: (x: Input): Output => f2.evaluate(f1.evaluate(x)),
		forward: (input: Input, change: InputChange, y: Output): OutputChange => {
			const v = f1.evaluate(input);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};
