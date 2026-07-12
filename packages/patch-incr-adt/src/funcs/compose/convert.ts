import type { AConstant } from "@/constant";
import { type $A, type IF1, type IFA, IFKind, type IFR } from "@/types";

export const convA1 = <A extends $A, B extends $A>(
	func: IFA<A, B>,
): IF1<A, B> => {
	const { input, output, evaluate, forward } = func;
	return {
		kind: IFKind.IF1,
		input,
		output,
		evaluate,
		forward,
	};
};

export const convAR = <A extends $A, B extends $A>(
	_func: IFA<A, B>,
): IFR<A, B, AConstant<null, null>> => {
	throw new Error("TODO");
};

export const conv1R = <A extends $A, B extends $A>(
	_func: IF1<A, B>,
): IFR<A, B, AConstant<null, null>> => {
	throw new Error("TODO");
};
