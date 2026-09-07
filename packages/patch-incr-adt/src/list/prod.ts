import { type AConstant, nullType } from "@/constant";
import type { BaseProductShaped } from "@/product";
import { product } from "@/product";
import type { RecBrand } from "@/props";
import type { DeriveRecordValue } from "@/record/types";
import type { $A, $T } from "@/types/algebra";
import { type AUnion, union } from "@/union";

/** A cons-cell for a linked list. */
export class Cons<T> {
	constructor(
		readonly head: T,
		readonly tail: Cons<T> | null = null,
	) {}

	toArray(): readonly T[] {
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

export class Nil<T> {
	INSTANCE = new Nil<never>();

	toArray(): readonly T[] {
		return [];
	}

	*[Symbol.iterator](): Iterator<T> {}

	[Symbol.for("nodejs.util.inspect.custom")]() {
		return { List: [] };
	}
}

export type TList<T> = Cons<T> | null;

export const cons = <T>(h: T, t = null as Cons<T> | null) => new Cons(h, t);

export const empty = <T>(): TList<T> => null;

export const fromArray = <T>(xs: T[]): TList<T> => {
	let l: TList<T> = null;
	for (let i = xs.length - 1; i >= 0; i--) {
		l = new Cons(xs[i] as T, l);
	}
	return l;
};

export interface ConsShape<A extends $A, Rec extends $A> {
	head: A;
	tail: Rec;
}

export interface ACons<A extends $A, Rec extends $A = AList<A>>
	extends BaseProductShaped<Cons<$T<A>>, ConsShape<A, Rec>> {
	fromRecord: (rec: DeriveRecordValue<ConsShape<A, Rec>>) => Cons<A>;
	toRecord: (cons: Cons<A>) => DeriveRecordValue<ConsShape<A, Rec>>;
}

export interface ListShape<A extends $A, Rec extends $A> {
	nil: AConstant<null, null>;
	cons: ACons<A, Rec>;
}

export interface AList<A extends $A>
	extends AUnion<ListShape<A, AList<A>>>,
		RecBrand {}

export const list = <TA extends $A>(apply: TA): AList<TA> => {
	type T = $T<TA>;
	const rec: AList<TA> = union(
		{
			nil: nullType(),
			cons: product<Cons<T>, ConsShape<TA, AList<TA>>, "head" | "tail">({
				shape: {
					head: apply,
					get tail(): AList<TA> {
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
					c: Cons<$T<TA>>,
					k: K,
				): $T<ConsShape<TA, AList<TA>>[K]> => c[k] as never,
				fromRecord: ({ head, tail }) => new Cons(head, tail),
				toRecord: ({ head, tail }) => ({ head, tail }),
			}),
		} satisfies ListShape<TA, AList<TA>>,
		(x) => (x ? "cons" : "nil"),
	);
	return rec;
};
