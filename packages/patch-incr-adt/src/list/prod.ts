import { type AConstant, nullType } from "@/constant";
import type { ProductApply } from "@/product";
import { product } from "@/product";
import type { AnyApply, InferApplyValue } from "@/types/algebra";
import { type AUnion, union } from "@/union";

/** A cons-cell for a linked list. */
export class Cons<T> {
	constructor(
		readonly head: T,
		readonly tail: Cons<T> | null = null,
	) {}

	toArray(): T[] {
		if (this.tail === null) {
			return [this.head];
		}
		return [this.head, ...this.tail.toArray()];
	}

	*[Symbol.iterator](): Iterator<T> {
		yield this.head;
		if (this.tail === null) return;
		yield* this.tail;
	}

	[Symbol.for("nodejs.util.inspect.custom")]() {
		return { List: this.toArray() };
	}
}

export type List<T> = Cons<T> | null;

export const cons = <T>(h: T, t = null as Cons<T> | null) => new Cons(h, t);

export const empty = <T>(): List<T> => null;

export const fromArray = <T>(xs: T[]): List<T> => {
	let l: List<T> = null;
	for (let i = xs.length - 1; i >= 0; i--) {
		l = new Cons(xs[i] as T, l);
	}
	return l;
};

export interface ConsShape<TA extends AnyApply, TRec extends AnyApply> {
	head: TA;
	tail: TRec;
}

export interface ListShape<TA extends AnyApply, Rec extends AnyApply> {
	nil: AConstant<null, null>;
	cons: ProductApply<Cons<InferApplyValue<TA>>, ConsShape<TA, Rec>>;
}

export interface ListApply<A extends AnyApply>
	extends AUnion<ListShape<A, ListApply<A>>> {}

export const list = <TA extends AnyApply>(apply: TA): ListApply<TA> => {
	type T = InferApplyValue<TA>;
	const rec: ListApply<TA> = union(
		{
			nil: nullType(),
			cons: product<Cons<T>, ConsShape<TA, ListApply<TA>>, "head" | "tail">({
				shape: {
					head: apply,
					get tail() {
						return rec;
					},
				},
				assign: (c, d) => {
					if (!Object.hasOwn(d, "head") && !Object.hasOwn(d, "tail")) return c;
					return new Cons(
						Object.hasOwn(d, "head") ? d.head : c.head,
						Object.hasOwn(d, "tail") ? d.tail : c.tail,
					) as typeof c;
				},
				get: <K extends "head" | "tail">(
					c: Cons<InferApplyValue<TA>>,
					k: K,
				): InferApplyValue<ConsShape<TA, ListApply<TA>>[K]> => c[k] as never,
				fromRecord: ({ head, tail }) => new Cons(head, tail),
				toRecord: ({ head, tail }) => ({ head, tail }),
			}),
		} satisfies ListShape<TA, ListApply<TA>>,
		(x) => (x ? "cons" : "nil"),
	);
	return rec;
};
