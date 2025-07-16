import type { Patches } from "../incr/patch";
import type { DF, DP } from "./types";

export const dfBind = <
	Input,
	Bind,
	Output,
	InputChange = Patches<Input>,
	BindChange = Patches<Bind>,
	OutputChange = Patches<Output>,
>(
	_getBind: DF<Input, Bind, InputChange, BindChange>,
	_getOut: (
		bind: Bind,
		input: DP<Input, InputChange>,
	) => DP<Output, OutputChange>,
) => {
	// TODO implement this
	throw new Error("TODO");
};
