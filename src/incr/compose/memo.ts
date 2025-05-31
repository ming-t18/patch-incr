import type { Patches } from "../patch";
import type { IF } from "../types";

export const composeMemoLeft = <
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
	const invoke1 = (x: Input): Interm => {
		if (memo.has(x)) {
			return memo.get(x) as Interm;
		}
		const v = f1.invoke(x);
		memo.set(x, v);
		return v;
	};
	return {
		invoke: (x: Input): Output => f2.invoke(invoke1(x)),
		forward: (input: Input, change, y): OutputChange => {
			const v = invoke1(input);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};

export const composeMemo = <
	Input,
	Interm,
	Output extends WeakKey,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
	memo0?: WeakMap<Output, Interm>,
): IF<Input, Output, InputChange, OutputChange> => {
	const memo = memo0 ?? new WeakMap<Output, Interm>();
	return {
		invoke: (x: Input): Output => {
			const v = f1.invoke(x);
			const y = f2.invoke(v);
			memo.set(y, v);
			return y;
		},
		forward: (input: Input, change: InputChange, y: Output): OutputChange => {
			if (!memo.has(y)) {
				const v = f1.invoke(input);
				const dv = f1.forward(input, change, v);
				memo.set(y, v);
				return f2.forward(v, dv, y);
			}

			const v = memo.get(y) as Interm;
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};

export class MemoComposer<A, B> {
	constructor(private readonly func: IF<A, B>) {}

	static create<A, B>(func: IF<A, B>): MemoComposer<A, B> {
		return new MemoComposer(func);
	}

	composeLeft<A1 extends WeakKey, C>(
		this: MemoComposer<A1, B>,
		func1: IF<B, C>,
	): MemoComposer<A1, C> {
		return new MemoComposer(composeMemoLeft(this.func, func1));
	}

	compose<C extends WeakKey>(func1: IF<B, C>): MemoComposer<A, C> {
		return new MemoComposer(composeMemo(this.func, func1));
	}

	build(): IF<A, B> {
		return this.func;
	}
}
