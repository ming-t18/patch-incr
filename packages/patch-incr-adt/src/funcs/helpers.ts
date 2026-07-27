import { getReplaceOnly } from "@/replaceOnly";
import type { $A, $D, $T } from "../types/abbr";
import {
	type Evaluate,
	type IF1,
	type IFA,
	IFKind,
} from "../types/func/incrFunc";

export const REEVAL = Symbol.for("patch-incr-adt:REEVAL");
export type REEVAL = typeof REEVAL;

export const makeForward =
	<A extends $A, B extends $A, DASub = A["~apply"]["internal"]>(
		input: A,
		output: B,
		{
			evaluate,
			forward,
		}: {
			evaluate: Evaluate<A, B>;
			forward: (x: $T<A>, dx: DASub, y: $T<B>) => $D<B> | REEVAL;
		},
	) =>
	(x: $T<A>, dx: $D<A>, y: $T<B>): $D<B> => {
		if (input.isEmpty(dx)) {
			return output.empty;
		}
		const rep = input.isReplace(dx);
		if (rep !== null) {
			return output.fromReplace(evaluate(getReplaceOnly(rep)));
		}

		const res = forward(x, dx as DASub, y);
		if (res === REEVAL) {
			return output.fromReplace(evaluate(input.apply(x, dx)));
		}
		return res;
	};

export const makeForwardA =
	<A extends $A, B extends $A, DASub = A["~apply"]["internal"]>(
		input: A,
		output: B,
		{
			evaluate,
			forward,
		}: {
			evaluate: Evaluate<A, B>;
			forward: (x: $T<A>, dx: DASub) => $D<B> | REEVAL;
		},
	) =>
	(x: $T<A>, dx: $D<A>): $D<B> => {
		if (input.isEmpty(dx)) {
			return output.empty;
		}
		const rep = input.isReplace(dx);
		if (rep !== null) {
			return output.fromReplace(evaluate(getReplaceOnly(rep)));
		}

		const res = forward(x, dx as DASub);
		if (res === REEVAL) {
			return output.fromReplace(evaluate(input.apply(x, dx)));
		}
		return res;
	};

export const makeIF1 = <
	A extends $A,
	B extends $A,
	DASub = A["~apply"]["internal"],
>(
	input: A,
	output: B,
	{
		evaluate,
		forward,
	}: {
		evaluate: Evaluate<A, B>;
		forward: (x: $T<A>, dx: DASub, y: $T<B>) => $D<B> | REEVAL;
	},
): IF1<A, B> => ({
	kind: IFKind.IF1,
	evaluate,
	forward: makeForward(input, output, { evaluate, forward }),
	input,
	output,
});

export const makeIFA = <
	A extends $A,
	B extends $A,
	DASub = A["~apply"]["internal"],
>(
	input: A,
	output: B,
	{
		evaluate,
		forward,
	}: {
		evaluate: Evaluate<A, B>;
		forward: (x: $T<A>, dx: DASub) => $D<B> | REEVAL;
	},
): IFA<A, B> => ({
	kind: IFKind.IFA,
	evaluate,
	forward: makeForwardA(input, output, { evaluate, forward }),
	input,
	output,
});

/** Class for partitioning a record/union shape into picked and omitted keys. */
export class ShapePartition<
	Shape extends Record<Key, unknown>,
	Key extends keyof Shape = keyof Shape,
	Picked extends Key = never,
> {
	constructor(
		readonly shape: Shape,
		readonly toPick: Record<Picked, unknown>,
		readonly shapeKeys = Object.keys(shape),
		readonly toPickKeys = Object.keys(toPick),
	) {}

	isPicked(key: Key): key is Picked {
		return Object.hasOwn(this.toPick, key);
	}

	partitionRecord<R extends Partial<Record<Key, unknown>>>(
		x: R,
	): [Pick<R, Picked>, Omit<R, Picked>] {
		const xIn: Pick<R, Picked> = {} as never;
		const xOut: Omit<R, Picked> = {} as never;
		for (const key of this.shapeKeys) {
			if (!Object.hasOwn(x, key)) {
				continue;
			}
			if (Object.hasOwn(this.toPick, key)) {
				// @ts-expect-error key is from picked part
				xIn[key] = x[key];
			} else {
				// @ts-expect-error key is from omitted part
				xOut[key] = x[key];
			}
		}
		return [xIn, xOut];
	}

	pickRecord<R extends Partial<Record<Key, unknown>>>(x: R): Pick<R, Picked> {
		const xIn: Pick<R, Picked> = {} as never;
		for (const key of this.shapeKeys) {
			if (!Object.hasOwn(x, key)) {
				continue;
			}
			if (Object.hasOwn(this.toPick, key)) {
				// @ts-expect-error key is from picked part
				xIn[key] = x[key];
			}
		}
		return xIn;
	}

	mergeRecord<R extends Partial<Record<Key, unknown>>>(
		left: Pick<R, Picked>,
		right: Omit<R, Picked>,
	): R {
		const merged: R = {} as never;
		for (const key of this.shapeKeys) {
			if (Object.hasOwn(this.toPick, key)) {
				if (Object.hasOwn(left, key)) {
					// @ts-expect-error key is from picked part
					merged[key] = left[key];
				}
			} else {
				if (Object.hasOwn(right, key)) {
					// @ts-expect-error key is from omitted part
					merged[key] = right[key];
				}
			}
		}
		return merged;
	}
}

export interface IsSubtype<T extends TSuper, TSuper> {
	readonly t: T;
	readonly tSuper: TSuper;
}
