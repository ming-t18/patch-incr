import { constant } from "@/constant";
import { record } from "@/record";
import type { RecordApply } from "@/record/types";
import type { AnyApply, Apply, DRO, InferApplyChange } from "@/types/algebra";
import { type UnionApply, union } from "@/union";

export type ListShape<TA extends AnyApply, Rec extends AnyApply> = {
	nil: Apply<null, null>;
	cons: RecordApply<{
		head: TA;
		tail: Rec;
	}>;
};

export interface ListApply<A extends AnyApply>
	extends UnionApply<ListShape<A, ListApply<A>>> {}

export type ListChange<TA extends AnyApply> = InferApplyChange<ListApply<TA>>;

export type List<T> = null | {
	head: T;
	tail: List<T>;
};

export const list = <T, DT = DRO<T>, A extends Apply<T, DT> = Apply<T, DT>>(
	ap: A,
): ListApply<A> => {
	const rec: ListApply<A> = union(
		{
			nil: constant(null, null),
			cons: record({
				head: ap,
				// Use getter for recursion
				get tail() {
					return rec;
				},
			}),
		} satisfies ListShape<A, ListApply<A>>,
		(x) => (x ? "cons" : "nil"),
	);
	return rec;
};
