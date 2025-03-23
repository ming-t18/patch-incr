import type { AccessTypesRecord } from "../incr/typeHelpers";
import type {
	AnyApply,
	AnyApplyCombine,
	ApplyCombine,
	InferApplyType,
} from "../incr/types";
import {
	type DRO,
	getDRO,
	getReplaceOnly,
	isReplaceOnly,
	makeReplaceOnly,
	maybeCombineDRO,
} from "./replaceOnly";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyRecord = Record<string, any>;

export type RecordChanges<R, Keys extends keyof R, C> =
	| Record<Keys, C>
	| DRO<R>;

export type InferRecordApplyValue<Defs extends Record<string, AnyApply>> = {
	[key in keyof Defs]: InferApplyType<Defs[key]>;
};

export type InferRecordApplyChange<Defs extends Record<string, AnyApply>> =
	| DRO<InferRecordApplyValue<Defs>>
	| AccessTypesRecord<"change", Defs>;

export type InferRecordApplyChangeOverall<
	Defs extends Record<string, AnyApply>,
> = InferRecordApplyChange<Defs> | DRO<InferRecordApplyValue<Defs>>;

export const recordApply = <Defs extends Record<string, AnyApplyCombine>>(
	defs: Defs,
): ApplyCombine<
	InferRecordApplyValue<Defs>,
	InferRecordApplyChangeOverall<Defs>
> => {
	type R = InferRecordApplyValue<Defs>;
	type DR = InferRecordApplyChangeOverall<Defs>;

	const apply = (value: R, change: DR): R => {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly<R>(change)) {
			return getReplaceOnly(change);
		}

		if (!change) return value;

		return Object.keys(change).reduce((obj, k) => {
			// @ts-expect-error Can't be checked
			obj[k] = defs[k].apply(obj[k], change[k]);
			return obj;
		}, {}) as R;
	};

	return {
		apply,
		fromReplace: (value: R): DR => makeReplaceOnly(value),
		empty: null,
		isEmpty: (x: DR) => x === null,
		isReplace: getDRO,
		combine: (left: DR, right: DR): DR => {
			return maybeCombineDRO<R, DR>(
				left,
				right,
				(s, c) => makeReplaceOnly(apply(s, c)),
				(left, right) =>
					Object.entries(right).reduce(
						(o, [k, v]) => {
							const v0 = Object.hasOwn(o, k) ? o[k] : defs[k].empty;
							// @ts-expect-error Can't be checked: indexing
							o[k] = defs[k].combine(v0, v);
							return o;
						},
						{ ...left },
					),
			);
		},
	};
};
