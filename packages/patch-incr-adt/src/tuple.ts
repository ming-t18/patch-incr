import {
	isReplaceOnly,
	makeReplaceOnly,
	ReplaceOnly,
} from "patch-incr/algebra";
import type {
	AnyADT,
	IFADT,
	InferTupleChange,
	InferTupleElim,
	InferTupleIntro,
	InferTupleTypes,
	Tuple,
} from "./types";

const tupleKeys = <Args>(args: Args): (keyof Args)[] => {
	const n = (args as never[]).length;
	return Array(n)
		.fill(null)
		.map((_, i) => i) as never;
};

const tupleShallowCopy = <Args>(args: Args): Args => {
	return [...(args as never as never[])] as never;
};

export const tuple = <Args extends AnyADT[]>(...args: Args): Tuple<Args> => {
	const keys = tupleKeys(args);
	const apply = (
		value: InferTupleTypes<Args>,
		change: InferTupleChange<Args>,
	): InferTupleTypes<Args> => {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return change[ReplaceOnly];
		}

		const res: typeof value = tupleShallowCopy(value);
		for (const key of keys) {
			const t: AnyADT = args[key] as never;
			res[key] = t.apply(res[key], change[key]);
		}
		return res;
	};
	return {
		combine: (
			left: InferTupleChange<Args>,
			right: InferTupleChange<Args>,
		): InferTupleChange<Args> => {
			if (right === null) {
				return left;
			}
			if (isReplaceOnly(right)) {
				return right;
			}
			if (left === null) {
				return right;
			}

			if (isReplaceOnly(left)) {
				return makeReplaceOnly(apply(left[ReplaceOnly], right));
			}

			const combined: InferTupleChange<Args> = tupleShallowCopy(left);
			for (const key of keys) {
				const t = args[key] as AnyADT;
				combined[key] = t.combine(combined[key], right[key]);
			}
			return combined;
		},
		apply,
		empty: null,
		fromReplace: makeReplaceOnly,
		isEmpty: (change: InferTupleChange<Args>): boolean => change === null,
		isReplace: (
			change: InferTupleChange<Args>,
		): ReplaceOnly<InferTupleTypes<Args>> | null =>
			isReplaceOnly(change) ? change : null,

		intro: <A, DA>(
			_args: InferTupleIntro<A, DA, Args>,
		): IFADT<A, DA, InferTupleTypes<Args>, InferTupleChange<Args>> => {
			throw new Error("Function not implemented.");
		},
		elim: <B, DB>(
			_args: InferTupleElim<B, DB, Args>,
		): IFADT<InferTupleChange<Args>, InferTupleTypes<Args>, B, DB> => {
			throw new Error("Function not implemented.");
		},
	};
};
