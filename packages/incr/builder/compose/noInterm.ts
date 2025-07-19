import type { Patches } from "../../patch";
import type { IF, IFInv } from "../../types";

export const composeWithInv = <
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
		evaluate: (x) => f2.evaluate(f1.evaluate(x)),
		forward: (input: Input, change: InputChange, y: Output): OutputChange => {
			const v: Interm = f2.inverseEvaluate(y);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv);
		},
	};
};
