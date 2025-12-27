import { MultiWeakMap } from "../../cache/weak_map";
import type { Patches } from "../../patch";
import type { IF } from "../../types";
import { identity } from "..";

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

export interface Create {
	<A extends WeakKey>(): MemoComposer<A>;
	<A extends WeakKey, B>(f: IF<A, B>): MemoComposer<A, B>;
}

export interface Pipe<X extends WeakKey, A extends WeakKey> {
	<B>(f1: IF<A, B>): MemoComposer<X, B>;
	<B, C>(f1: IF<A, B>, f2: IF<B, C>): MemoComposer<X, C>;
	<B, C, D>(f1: IF<A, B>, f2: IF<B, C>, f3: IF<C, D>): MemoComposer<X, D>;
	<B, C, D, E>(
		f1: IF<A, B>,
		f2: IF<B, C>,
		f3: IF<C, D>,
		f4: IF<D, E>,
	): MemoComposer<X, E>;
	<B, C, D, E, F>(
		f1: IF<A, B>,
		f2: IF<B, C>,
		f3: IF<C, D>,
		f4: IF<D, E>,
		f5: IF<E, F>,
	): MemoComposer<X, E>;
	<R>(
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		_f1: IF<any, any>,
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		_f2: IF<any, any>,
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		_f3: IF<any, any>,
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		_f4: IF<any, any>,
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		_f5: IF<any, any>,
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		_f6: IF<any, any>,
		// biome-ignore lint/suspicious/noExplicitAny: intentional
		...args: IF<any, any>[]
	): MemoComposer<X, R>;
}

export class MemoComposer<A extends WeakKey, B = A> {
	constructor(private readonly func: IF<A, B> | null) {}

	static create: Create = <A extends WeakKey, B = A>(
		func?: IF<A, B> | null,
	): MemoComposer<A, B> => new MemoComposer(func ?? null);

	// @ts-expect-error Can't be checked
	pipe: Pipe<A, B> = (
		...args: IF<unknown, unknown>[]
	): MemoComposer<A, unknown> => {
		if (args.length === 0) {
			return this as never;
		}

		let f = this.func;
		for (const arg of args) {
			// @ts-expect-error Can't be checked
			f = f ? composeMemoL(f, arg) : arg;
		}

		return new MemoComposer(f) as never;
	};

	build(): IF<A, B> {
		return this.func ?? (identity() as never);
	}
}

export const composer: Create = MemoComposer.create;
