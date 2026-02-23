import type { IF } from "@/types";
import { bind } from "../bind";
import { composeReeval } from "../compose";
import * as Pair from "../pair";
import { access, accessPathOpt } from "./access";

export const access2 = <
	Input,
	Key extends (string | number) & keyof Input = (string | number) & keyof Input,
>(): IF<[Input, Key], Input[Key]> => {
	return bind(Pair.snd(), (key: Key) =>
		composeReeval(Pair.fst(), access<Input[Key], Key, Input>(key)),
	);
};

export const access2Opt = <
	Input,
	Key extends string | number = (string | number) & keyof Input,
>(): IF<[Input, Key], Input[keyof Input] | undefined> => {
	return bind(Pair.snd(), (key: Key) => accessPathOpt([key]));
};
