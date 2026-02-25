import { isTrivial } from "../../hints";
import type { Patches } from "../../patch";
import * as ps from "../../patchSchema";
import type { AnyPatchSchema, PatchSchema } from "../../patchSchema/types";
import type { AnyIF, IF, NoForwardOutput } from "../../types";
import { identity } from "..";
import { composeReeval } from "./reeval";

export const composeMemo4 = <
	Input extends WeakKey,
	A,
	B,
	C,
	Output,
	InputChange = Patches<Input>,
	DA = Patches<A>,
	DB = Patches<B>,
	DC = Patches<C>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, A, InputChange, DA>,
	f2: IF<A, B, DA, DB>,
	f3: IF<B, C, DB, DC>,
	f4: IF<C, Output, DC, OutputChange>,
	memo0?: WeakMap<Input, [A, B, C, Output]>,
	inputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Input,
		InputChange
	>,
	outputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Output,
		OutputChange
	>,
): IF<Input, Output, InputChange, OutputChange, NoForwardOutput> => {
	const memo = memo0 ?? new WeakMap();
	const evaluate1 = (x: Input): [A, B, C, Output] => {
		const res = memo.get(x);
		if (res) {
			return res;
		}
		const a = f1.evaluate(x);
		const b = f2.evaluate(a);
		const c = f3.evaluate(b);
		const o = f4.evaluate(c);
		const res1: [A, B, C, Output] = [a, b, c, o];
		memo.set(x, res1);
		return res1;
	};

	const evaluateMemo3 = (x: Input): Output => evaluate1(x)[3];
	const forwardMemo3 = (
		input: Input,
		change: InputChange,
		_ignored?: Output,
	): OutputChange => {
		if (inputSchema.isEmpty(change)) {
			return outputSchema.empty;
		}
		const [a, b, c, o] = evaluate1(input);
		const da = f1.forward(input, change, a);
		const db = f2.forward(a, da, b);
		const dc = f3.forward(b, db, c);
		return f4.forward(c, dc, o);
	};
	return {
		evaluate: evaluateMemo3,
		forward: forwardMemo3,
	};
};

export const composeMemo3 = <
	Input extends WeakKey,
	A,
	B,
	Output,
	InputChange = Patches<Input>,
	DA = Patches<A>,
	DB = Patches<B>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, A, InputChange, DA>,
	f2: IF<A, B, DA, DB>,
	f3: IF<B, Output, DB, OutputChange>,
	memo0?: WeakMap<Input, [A, B, Output]>,
	inputSchema = ps.atomic<Input>() as AnyPatchSchema as PatchSchema<
		Input,
		InputChange
	>,
	outputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Output,
		OutputChange
	>,
): IF<Input, Output, InputChange, OutputChange, NoForwardOutput> => {
	const memo = memo0 ?? new WeakMap();
	const evaluate1 = (x: Input): [A, B, Output] => {
		const res = memo.get(x);
		if (res) {
			return res;
		}
		const a = f1.evaluate(x);
		const b = f2.evaluate(a);
		const o = f3.evaluate(b);
		const res1: [A, B, Output] = [a, b, o];
		memo.set(x, res1);
		return res1;
	};

	const evaluateMemo3 = (x: Input): Output => evaluate1(x)[2];
	const forwardMemo3 = (
		input: Input,
		change: InputChange,
		_ignored?: Output,
	): OutputChange => {
		if (inputSchema.isEmpty(change)) {
			return outputSchema.empty;
		}
		const [a, b, o] = evaluate1(input);
		const da = f1.forward(input, change, a);
		const db = f2.forward(a, da, b);
		return f3.forward(b, db, o);
	};
	return {
		evaluate: evaluateMemo3,
		forward: forwardMemo3,
	};
};

export const composeMemo2 = <
	Input extends WeakKey,
	Interm,
	Output,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
	memo0?: WeakMap<Input, [Interm, Output]>,
	inputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Input,
		InputChange
	>,
	outputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Output,
		OutputChange
	>,
): IF<Input, Output, InputChange, OutputChange, NoForwardOutput> => {
	const memo = memo0 ?? new WeakMap<Input, [Interm, Output]>();
	const evaluate1 = (x: Input): [Interm, Output] => {
		const res = memo.get(x);
		if (res) {
			return res;
		}
		const v = f1.evaluate(x);
		const y = f2.evaluate(v);
		const res1: [Interm, Output] = [v, y];
		memo.set(x, res1);
		return res1;
	};

	const evaluateMemo = (x: Input): Output => evaluate1(x)[1];
	const forwardMemo = (
		input: Input,
		change: InputChange,
		_?: Output,
	): OutputChange => {
		if (inputSchema.isEmpty(change)) {
			return outputSchema.empty;
		}
		const [v, y] = evaluate1(input);
		const dv = f1.forward(input, change, v);
		const dv1 = f2.forward(v, dv, y);
		return dv1;
	};
	return {
		evaluate: evaluateMemo,
		forward: forwardMemo,
	};
};

export const memoed = <
	Input extends WeakKey,
	Output,
	InputChange,
	OutputChange = Patches<Output>,
>(
	func: IF<Input, Output, InputChange, OutputChange>,
	memo0?: WeakMap<Input, Output>,
	inputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Input,
		InputChange
	>,
	outputSchema = ps.atomic() as AnyPatchSchema as PatchSchema<
		Output,
		OutputChange
	>,
): IF<Input, Output, InputChange, OutputChange, NoForwardOutput> => {
	const memo = memo0 ?? new WeakMap<Input, Output>();
	const evaluateMemoed = isTrivial(func)
		? func.evaluate
		: (x: Input): Output => {
				if (memo.has(x)) {
					return memo.get(x) as Output;
				}
				const y = func.evaluate(x);
				memo.set(x, y);
				return y;
			};

	const forwardMemoed = (
		input: Input,
		change: InputChange,
		_?: Output,
	): OutputChange => {
		if (inputSchema.isEmpty(change)) {
			return outputSchema.empty;
		}
		const y = evaluateMemoed(input);
		return func.forward(input, change, y);
	};
	return {
		evaluate: evaluateMemoed,
		forward: forwardMemoed,
	};
};

export interface ComposeMemo {
	// identity
	<In extends WeakKey, DIn = Patches<In>>(): IF<
		In,
		In,
		DIn,
		DIn,
		NoForwardOutput
	>;

	// memoed
	<In extends WeakKey, Out, DIn = Patches<In>, DOut = Patches<Out>>(
		f1: IF<In, Out, DIn, DOut>,
	): IF<In, Out, DIn, DOut, NoForwardOutput>;

	// 2-way
	<
		In extends WeakKey,
		Out,
		A1,
		DIn = Patches<In>,
		DOut = Patches<Out>,
		DA1 = Patches<A1>,
	>(
		f1: IF<In, A1, DIn, DA1>,
		f2: IF<A1, Out, DA1, DOut>,
	): IF<In, Out, DIn, DOut, NoForwardOutput>;

	// 3-way
	<
		In extends WeakKey,
		Out,
		A1,
		A2,
		DIn = Patches<In>,
		DOut = Patches<Out>,
		DA1 = Patches<A1>,
		DA2 = Patches<A2>,
	>(
		f1: IF<In, A1, DIn, DA1>,
		f2: IF<A1, A2, DA1, DA2>,
		f3: IF<A2, Out, DA2, DOut>,
	): IF<In, Out, DIn, DOut, NoForwardOutput>;

	// 4-way
	<
		In extends WeakKey,
		Out,
		A1,
		A2,
		A3,
		DIn = Patches<In>,
		DOut = Patches<Out>,
		DA1 = Patches<A1>,
		DA2 = Patches<A2>,
		DA3 = Patches<A3>,
	>(
		f1: IF<In, A1, DIn, DA1>,
		f2: IF<A1, A2, DA1, DA2>,
		f3: IF<A2, A3, DA2, DA3>,
		f4: IF<A3, Out, DA2, DOut>,
	): IF<In, Out, DIn, DOut, NoForwardOutput>;

	// 5-way
	<
		In extends WeakKey,
		Out,
		A1,
		A2,
		A3,
		A4,
		DIn = Patches<In>,
		DOut = Patches<Out>,
		DA1 = Patches<A1>,
		DA2 = Patches<A2>,
		DA3 = Patches<A3>,
		DA4 = Patches<A4>,
	>(
		f1: IF<In, A1, DIn, DA1>,
		f2: IF<A1, A2, DA1, DA2>,
		f3: IF<A2, A3, DA2, DA3>,
		f4: IF<A3, A4, DA3, DA4>,
		f5: IF<A4, Out, DA2, DOut>,
	): IF<In, Out, DIn, DOut, NoForwardOutput>;

	// 6-way
	<
		In extends WeakKey,
		Out,
		A1,
		A2,
		A3,
		A4,
		A5,
		DIn = Patches<In>,
		DOut = Patches<Out>,
		DA1 = Patches<A1>,
		DA2 = Patches<A2>,
		DA3 = Patches<A3>,
		DA4 = Patches<A4>,
		DA5 = Patches<A5>,
	>(
		f1: IF<In, A1, DIn, DA1>,
		f2: IF<A1, A2, DA1, DA2>,
		f3: IF<A2, A3, DA2, DA3>,
		f4: IF<A3, A4, DA3, DA4>,
		f5: IF<A4, A5, DA4, DA5>,
		f6: IF<A5, Out, DA5, DOut>,
	): IF<In, Out, DIn, DOut, NoForwardOutput>;
}

const composeMemoGeneric = <
	In extends WeakKey,
	Out,
	DIn = Patches<In>,
	DOut = Patches<Out>,
>(
	funcs: AnyIF[],
	map: WeakMap<In, never>,
	inS: PatchSchema<In, DIn>,
	outS: PatchSchema<Out, DOut>,
): IF<In, Out, DIn, DOut, NoForwardOutput> => {
	if (funcs.length === 0) {
		throw new Error("composeMemo: invalid number of functions to compose");
	}

	if (funcs.length === 1) {
		return memoed(funcs[0], map, inS, outS);
	}
	if (funcs.length === 2) {
		return composeMemo2(funcs[0], funcs[1], map, inS, outS);
	}
	if (funcs.length === 3) {
		return composeMemo3(funcs[0], funcs[1], funcs[2], map, inS, outS);
	}
	if (funcs.length === 4) {
		return composeMemo4(funcs[0], funcs[1], funcs[2], funcs[3], map, inS, outS);
	}
	throw new Error("composeMemo: too many functions");
};

export const composeMemo: ComposeMemo = (...args: unknown[]): AnyIF => {
	const funcs = args as never[];
	const map = new WeakMap<WeakKey, never>();
	const inS = ps.atomic<WeakKey>();
	const outS = ps.atomic();
	// const [funcs, map, inS, outS] = splitArgs(args);
	if (funcs.length === 0) {
		return identity();
	}
	if (funcs.length === 1) {
		return memoed(funcs[0], map, inS, outS);
	}
	return composeMemoGeneric(funcs, map, inS, outS);
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
			f = f ? composeMemo(f, arg) : arg;
		}

		return new MemoComposer(f) as never;
	};

	build(): IF<A, B> {
		return this.func ?? (identity() as never);
	}
}

export const composer: Create = MemoComposer.create;
