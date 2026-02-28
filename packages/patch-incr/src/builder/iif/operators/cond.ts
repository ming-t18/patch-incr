import * as C from "@/builder/cond";
import { compile } from "../compile";
import { composeWith, isNode } from "../node";
import type { Operator } from "../types";

const id = <T>(x: T) => x;

const toBool = <T>(x: T) => !!x;

export const cond = <Input extends WeakKey, A, B = A>(
	pred: (input: Input) => boolean,
	ifTrue: (input: Input) => A,
	ifFalse: (input: Input) => B,
): Operator<[Input], A | B> => {
	const condOp = (input: Input): A | B => {
		if (isNode<Input>(input)) {
			return composeWith(
				input,
				C.condSingle(pred, compile(ifTrue), compile(ifFalse)),
			) as A | B;
		}
		return pred(input) ? ifTrue(input) : ifFalse(input);
	};
	return condOp;
};

export const and = <Input extends WeakKey, A>(
	ifTrue: (input: Input) => A,
): Operator<[Input], Input | A> => cond(toBool, ifTrue, id);

export const or = <Input extends WeakKey, B>(
	ifFalse: (input: Input) => B,
): Operator<[Input], Input | B> => cond(toBool, id, ifFalse);
