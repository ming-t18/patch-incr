import * as IFArray from "patch-incr/builder/array";
import * as Df from "./df";
import type { DF } from "./types";

export const map = <Input, Output>(
	func: DF<Input, Output>,
): DF<Input[], Output[]> => {
	return Df.fromIF(IFArray.map(Df.toIF(func)));
};

export const filter = <Input>(
	pred: (value: Input) => boolean,
): DF<Input[], [Input[], number[]]> => {
	return Df.fromIF(IFArray.filter(pred));
};
