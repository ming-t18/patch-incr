import { isReplaceOnly } from "../../algebra/replaceOnly";
import * as ps from "../../patchSchema";
import { type Patches, applyPatches, replacePatch } from "../patch";
import type { IF } from "../types";

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
	const outSchema = ps.tuple(ps.atomic<Output>(), ps.atomic<Interm>());

	const evaluateCompose = (x: Input): [Output, Interm] => {
		const v = f1.evaluate(x);
		return [f2.evaluate(v), v];
	};
	const forward = (
		input: Input,
		change: Patches<Input>,
		[output, interm]: [Output, Interm],
	) => {
		const dInterm = f1.forward(input, change, interm);
		const dOutput = f2.forward(interm, dInterm, output);
		return outSchema.combine(
			outSchema.liftIndex(0, dOutput),
			outSchema.liftIndex(1, dInterm),
		);
	};
	return {
		evaluate: evaluateCompose,
		forward,
	};
};

export const composePair1 = <Input, InputPassed, Interm, Output>(
	f1: IF<Input, Interm>,
	f2: IF<Interm, Output>,
): IF<[Input, InputPassed], [Output, [InputPassed, Interm]]> => {
	const pairSchema = ps.tuple(ps.atomic<Input>(), ps.atomic<InputPassed>());
	const outPairSchema = ps.tuple(ps.atomic<InputPassed>(), ps.atomic<Interm>());
	const outSchema = ps.tuple(ps.atomic<Output>(), outPairSchema);
	const evaluateCompose = ([x, z]: [Input, InputPassed]): [
		Output,
		[InputPassed, Interm],
	] => {
		const v = f1.evaluate(x);
		return [f2.evaluate(v), [z, v]];
	};

	const forward = (
		input: [Input, InputPassed],
		change: Patches<[Input, InputPassed]>,
		[y, pair]: [Output, [InputPassed, Interm]],
	) => {
		const [z0, v] = pair;
		const [x, z1] = input;
		if (!Object.is(z0, z1)) {
			throw new Error("composePair1: passed through values are different");
		}

		const res = pairSchema.analyze(change);
		if (res === null) {
			return [];
		}

		if (isReplaceOnly(res)) {
			return replacePatch(evaluateCompose(applyPatches(input, change)));
		}

		const dx = res[0]?.inner ?? pairSchema.$[0].empty;
		const dz = res[1]?.inner ?? pairSchema.$[1].empty;
		const dv = f1.forward(x, dx, v);
		const dOutput = f2.forward(v, dv, y);
		return outSchema.combine(
			outSchema.liftIndex(0, dOutput),
			outSchema.liftIndex(
				1,
				outPairSchema.combine(
					outPairSchema.liftIndex(0, dz),
					outPairSchema.liftIndex(1, dv),
				),
			),
		);
	};

	return {
		evaluate: evaluateCompose,
		forward,
	};
};

export const composePair2 = <Input, Interm, IntermSaved, Output>(
	f1: IF<Input, [Interm, IntermSaved]>,
	f2: IF<Interm, Output>,
): IF<Input, [Output, [Interm, IntermSaved]]> => {
	const pairSchema = ps.tuple(ps.atomic<Interm>(), ps.atomic<IntermSaved>());
	const outSchema = ps.tuple(ps.atomic<Output>(), pairSchema);
	const evaluateCompose = (x: Input): [Output, [Interm, IntermSaved]] => {
		const [v, w] = f1.evaluate(x);
		return [f2.evaluate(v), [v, w]];
	};
	const forward = (
		input: Input,
		change: Patches<Input>,
		[output, pair]: [Output, [Interm, IntermSaved]],
	) => {
		const dPair: Patches<[Interm, IntermSaved]> = f1.forward(
			input,
			change,
			pair,
		);
		const res = pairSchema.analyze(dPair);
		if (res === null) {
			return outSchema.empty;
		}

		if (isReplaceOnly(res)) {
			return replacePatch(evaluateCompose(applyPatches(input, change)));
		}

		const dInterm = res[0]?.inner ?? pairSchema.$[0].empty;
		const interm = pair[0];
		const dOutput = f2.forward(interm, dInterm, output);
		return outSchema.combine(
			outSchema.liftIndex(0, dOutput),
			outSchema.liftIndex(1, dPair),
		);
	};
	return {
		evaluate: evaluateCompose,
		forward,
	};
};
