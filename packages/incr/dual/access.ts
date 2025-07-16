import { access } from "../builder/struct";
import type { Patches } from "../patchAnalysis/types";
import { dfFromIFNoMemo } from "./convert";
import type { DF } from "./types";

const _dfAccess = <
	Output,
	Key extends string | number,
	Input extends {
		[key in Key]: Output;
	} = {
		[key in Key]: Output;
	},
>(
	key: Key,
): DF<Input, Output, Patches<Input>, Patches<Output>> =>
	dfFromIFNoMemo(access(key));

export const dfAccess =
	<Input extends {}>() =>
	<Key extends keyof Input & (string | number)>(
		key: Key,
	): DF<Input, Input[Key], Patches<Input>, Patches<Input[Key]>> =>
		_dfAccess<Input[Key], Key, Input>(key);
