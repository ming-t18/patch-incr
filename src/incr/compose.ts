import { type CacheWrite, IncrCache } from "../cache/incr_cache";
import { type StructuralChangeBuilder, patchesBuilder } from "./builder";
import { type Patches, applyPatches } from "./patch";
import type { IF, IFInv } from "./types";

/**
 * Incremental function composition
 */

/**
 *
 * @param f1
 * @param f2
 * @param outBuilder
 * @returns
 */
export const compose = <Input, Interm, Output>(
	f1: IF<Input, Interm>,
	f2: IF<Interm, Output>,
): IF<Input, [Output, Interm]> => {
	const outBuilder = patchesBuilder;
	type ComposeOutputChange = Patches<[Output, Interm]>;

	const invokeCompose = (x: Input): [Output, Interm] => {
		const v = f1.invoke(x);
		return [f2.invoke(v), v];
	};
	const forward = (
		input: Input,
		change: Patches<Input>,
		[output, interm]: [Output, Interm],
	) => {
		const dInterm = f1.forward(input, change, interm);
		const dOutput = f2.forward(interm, dInterm, output);
		return outBuilder.combine<ComposeOutputChange>(
			outBuilder.liftIndex(0, dOutput),
			outBuilder.liftIndex(1, dInterm),
		);
	};
	return {
		invoke: invokeCompose,
		forward,
	};
};

export const composeNoInterm = <
	Input,
	Interm,
	Output,
	InputChange = Patches<Input>,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IFInv<Interm, Output, IntermChange, OutputChange>,
): IF<Input, Output, InputChange, OutputChange> => {
	return {
		invoke: (x) => f2.invoke(f1.invoke(x)),
		forward: (input: Input, change: InputChange, y: Output): OutputChange => {
			const v: Interm = f2.inverseInvoke(y);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv);
		},
	};
};

export const composeMemo = <
	Input,
	Interm,
	Output,
	InputChange,
	IntermChange = Patches<Interm>,
	OutputChange = Patches<Output>,
>(
	f1: IF<Input, Interm, InputChange, IntermChange>,
	f2: IF<Interm, Output, IntermChange, OutputChange>,
	memo: CacheWrite<Input, Interm>,
	outBuilder = patchesBuilder as never as StructuralChangeBuilder<
		unknown,
		IntermChange | OutputChange
	>,
): IF<Input, Output, InputChange, OutputChange> => {
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
		forward: (input, change, y): OutputChange => {
			const v = invoke1(input);
			const dv = f1.forward(input, change, v);
			return f2.forward(v, dv, y);
		},
	};
};

export class MemoComposer<A, B> {
	constructor(public readonly func: IF<A, B>) {}

	static create<A, B>(func: IF<A, B>): MemoComposer<A, B> {
		return new MemoComposer(func);
	}

	compose<C>(func1: IF<B, C>): MemoComposer<A, C> {
		return new MemoComposer(
			composeMemo(this.func, func1, new IncrCache<A, B>()),
		);
	}

	build(): IF<A, B> {
		return this.func;
	}
}
