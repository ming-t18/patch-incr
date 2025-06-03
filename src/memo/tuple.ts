import {
	type DRO,
	getReplaceOnly,
	isReplaceOnly,
	makeReplaceOnly,
} from "../algebra/replaceOnly";
import type { AccessTypesTuple } from "../incr/typeHelpers";
import type { AnyApplyCombine, Apply, ApplyCombine, IF } from "../incr/types";

export type InferTupleValue<Applys extends AnyApplyCombine[]> =
	AccessTypesTuple<"value", Applys>;

export type InferTupleChange<Applys extends AnyApplyCombine[]> = {
	tupleChange: AccessTypesTuple<"change", Applys>;
};

export type InferTupleChangeOverall<Applys extends AnyApplyCombine[]> =
	| InferTupleChange<Applys>
	| DRO<InferTupleValue<Applys>>;

export const tupleApply = <Applys extends AnyApplyCombine[]>(
	...applys: Applys
): ApplyCombine<InferTupleValue<Applys>, InferTupleChangeOverall<Applys>> => {
	const apply = (
		value: InferTupleValue<Applys>,
		change: InferTupleChangeOverall<Applys>,
	): InferTupleValue<Applys> => {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}
		const res: typeof value = [...value];
		const { tupleChange } = change;
		for (let i = 0; i < applys.length; i++) {
			res[i] = applys[i].apply(res[i], tupleChange[i]);
		}
		return res;
	};

	return {
		apply,
		empty: null,
		fromReplace: (x: InferTupleValue<Applys>) => makeReplaceOnly(x),
		isEmpty: (change: InferTupleChangeOverall<Applys>) => change !== null,
		isReplace: (change: InferTupleChangeOverall<Applys>) =>
			isReplaceOnly(change) ? change : null,
		combine: (
			left: InferTupleChangeOverall<Applys>,
			right: InferTupleChangeOverall<Applys>,
		): InferTupleChangeOverall<Applys> => {
			if (left === null) {
				return right;
			}
			if (right === null) {
				return left;
			}

			if (isReplaceOnly<InferTupleValue<Applys>>(right)) {
				return right;
			}

			if (isReplaceOnly<InferTupleValue<Applys>>(left)) {
				return makeReplaceOnly(apply(getReplaceOnly(left), right));
			}

			const ret: InferTupleChange<Applys>["tupleChange"] = [
				...left.tupleChange,
			];
			for (let i = 0; i < applys.length; i++) {
				ret[i] = applys[i].combine(ret[i], right.tupleChange[i]);
			}
			return { tupleChange: ret };
		},
	};
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type TupleDef<Input = any, Change = any> = IF<Input, any, Change, any>[];

export type InferTupleDefReturn<Def extends TupleDef> = AccessTypesTuple<
	"output",
	Def
>;

export type InferTupleDefChanges<Def extends TupleDef> =
	| DRO<InferTupleDefReturn<Def>>
	| { tupleChange: AccessTypesTuple<"outputChange", Def> };

export const tuple = <Input, Change, Def extends TupleDef<Input, Change>>(
	def: Def,
	apply: Apply<Input, Change>,
): IF<Input, InferTupleDefReturn<Def>, Change, InferTupleDefChanges<Def>> => {
	// @ts-expect-error Reassigning type
	const evaluate: evaluate<Input, InferTupleDefReturn<Def>> = (x: Input) =>
		def.map((f) => f.evaluate(x));
	return {
		evaluate,
		forward: (x: Input, dx: Change, y: InferTupleDefReturn<Def>) => {
			if (apply.isEmpty(dx)) {
				return null;
			}
			const r = apply.isReplace(dx);
			if (r !== null) {
				return makeReplaceOnly(evaluate(getReplaceOnly(r)));
			}

			const out: AccessTypesTuple<"outputChange", Def> = [] as never;
			for (let i = 0; i < def.length; i++) {
				out.push(def[i].forward(x, dx, y[i]));
			}
			return { tupleChange: out };
		},
	};
};
