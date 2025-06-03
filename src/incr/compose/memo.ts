import { MultiWeakMap } from "../../cache/weak_map";
import type { Patches } from "../patch";
import type { IF } from "../types";

export const composeMemoL = <
	Input extends WeakKey,
	Interm,
	Output,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
	memo0?: WeakMap<Input, Interm>,
): IF<Input, Output, InputChange, OutputChange> => {
	const memo = memo0 ?? new WeakMap<Input, Interm>();
	const evaluate1 = (x: Input): Interm => {
		if (memo.has(x)) {
			return memo.get(x) as Interm;
		}
		const v = f1.evaluate(x);
		memo.set(x, v);
		return v;
	};
	return {
		evaluate: (x: Input): Output => f2.evaluate(evaluate1(x)),
		forward: (input: Input, change: InputChange, y: Output): OutputChange => {
			const v = evaluate1(input);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};

export const composeMemoR = <
	Input extends WeakKey,
	Interm,
	Output extends WeakKey,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
	memo0?: MultiWeakMap<[Input, Output], Interm>,
): IF<Input, Output, InputChange, OutputChange> => {
	const memo = memo0 ?? new MultiWeakMap<[Input, Output], Interm>();
	return {
		evaluate: (x: Input): Output => {
			const v = f1.evaluate(x);
			const y = f2.evaluate(v);
			memo.set([x, y], v);
			return y;
		},
		forward: (input: Input, change: InputChange, y: Output): OutputChange => {
			const v = memo.getOrCompute([input, y], () => f1.evaluate(input));
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};

export class MemoComposer<A extends WeakKey, B> {
	constructor(private readonly func: IF<A, B>) {}

	static create<A extends WeakKey, B>(func: IF<A, B>): MemoComposer<A, B> {
		return new MemoComposer(func);
	}

	composeLeft<C extends WeakKey>(func1: IF<B, C>): MemoComposer<A, C> {
		return new MemoComposer(composeMemoL(this.func, func1));
	}

	compose<C extends WeakKey>(func1: IF<B, C>): MemoComposer<A, C> {
		return new MemoComposer(composeMemoR(this.func, func1));
	}

	build(): IF<A, B> {
		return this.func;
	}
}
