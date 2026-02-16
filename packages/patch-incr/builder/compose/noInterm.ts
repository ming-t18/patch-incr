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
	const evaluateComposeWithInv = (x: Input) => f2.evaluate(f1.evaluate(x));
	const forwardComposeWithInv = (
		input: Input,
		change: InputChange,
		y: Output,
	): OutputChange => {
		const v: Interm = f2.inverseEvaluate(y);
		const dv = f1.forward(input, change, v);
		return f2.forward(v, dv);
	};
	return {
		evaluate: evaluateComposeWithInv,
		forward: forwardComposeWithInv,
	};
};

export const composeIFInv = <
	Input,
	Interm,
	Output,
	InputChange = Patches<Input>,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IFInv<Input, Interm, InputChange, IntermChange>,
	f2: IFInv<Interm, Output, IntermChange, OutputChange>,
): IFInv<Input, Output, InputChange, OutputChange> => {
	const evaluateComposeIFInv = (x: Input) => f2.evaluate(f1.evaluate(x));
	const inverseEvaluateComposeIFInv = (y: Output) =>
		f1.inverseEvaluate(f2.inverseEvaluate(y));
	const forwardComposeIFInv = (
		input: Input,
		change: InputChange,
		y: Output,
	): OutputChange => {
		const v: Interm = f2.inverseEvaluate(y);
		const dv = f1.forward(input, change, v);
		return f2.forward(v, dv);
	};
	return {
		evaluate: evaluateComposeIFInv,
		inverseEvaluate: inverseEvaluateComposeIFInv,
		forward: forwardComposeIFInv,
	} as IFInv<Input, Output, InputChange, OutputChange>;
};

export const composeIFInv3 = <
	A,
	B,
	C,
	D,
	DA = Patches<A>,
	DB = Patches<B>,
	DC = Patches<C>,
	DD = Patches<D>,
>(
	f1: IFInv<A, B, DA, DB>,
	f2: IFInv<B, C, DB, DC>,
	f3: IFInv<C, D, DC, DD>,
): IFInv<A, D, DA, DD> => {
	return composeIFInv(composeIFInv(f1, f2), f3);
};

export const composeIFInv4 = <
	A,
	B,
	C,
	D,
	E,
	DA = Patches<A>,
	DB = Patches<B>,
	DC = Patches<C>,
	DD = Patches<D>,
	DE = Patches<E>,
>(
	f1: IFInv<A, B, DA, DB>,
	f2: IFInv<B, C, DB, DC>,
	f3: IFInv<C, D, DC, DD>,
	f4: IFInv<D, E, DD, DE>,
): IFInv<A, E, DA, DE> => {
	return composeIFInv(composeIFInv(f1, f2), composeIFInv(f3, f4));
};
