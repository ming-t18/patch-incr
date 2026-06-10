import { constant } from "@/constant";
import type { ProductApply } from "@/product";
import { product } from "@/product";
import { record } from "@/record";
import type { AnyApply, Apply, InferApplyValue } from "@/types/algebra";
import { type UnionApply, union } from "@/union";

export class Cons<T> {
	constructor(
		readonly head: T,
		readonly tail: Cons<T> | null = null,
	) {}
}

export interface ConsShape<TA extends AnyApply, Rec extends AnyApply> {
	head: TA;
	tail: Rec;
}

export interface ListShape<TA extends AnyApply, Rec extends AnyApply> {
	nil: Apply<null, null>;
	cons: ProductApply<
		Cons<InferApplyValue<TA>>,
		ConsShape<TA, Rec>,
		"head" | "tail"
	>;
}

export interface ListApply<A extends AnyApply>
	extends UnionApply<ListShape<A, ListApply<A>>> {}

export const list = <TA extends AnyApply>(apply: TA): ListApply<TA> => {
	type T = InferApplyValue<TA>;
	// type DT = InferApplyChange<TA>;
	const rec: ListApply<TA> = union(
		{
			nil: constant(null, null),
			cons: product<Cons<T>, ConsShape<TA, ListApply<TA>>, "head" | "tail">(
				record({
					head: apply,
					// Use getter for recursion
					get tail() {
						return rec;
					},
				}),
				(cons1: Cons<T>, dcons1): Cons<T> => {
					return new Cons(
						dcons1.head !== undefined
							? apply.apply(cons1.head, dcons1.head)
							: cons1.head,
						dcons1.tail !== undefined
							? rec.apply(cons1.tail, dcons1.tail)
							: cons1.tail,
					);
				},
			),
		} satisfies ListShape<TA, ListApply<TA>>,
		(x) => (x ? "cons" : "nil"),
	);
	return rec;
};
