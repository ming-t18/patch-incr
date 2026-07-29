import { composeA, condA, constant, FProduct, FUnion, trimA } from "@/funcs";
import { type APair, pair } from "@/pair";
import { FPair } from "@/pair/func";
import type { $A, $D, $T } from "@/types/abbr";
import { type IFA, IFKind } from "@/types/func";
import { type AList, type Cons, list } from "./prod";

class MemoedRec<A extends $A, B extends $A> implements IFA<AList<A>, B> {
	private _func: IFA<AList<A>, B> | null = null;
	public readonly kind = IFKind.IFA as const;
	constructor(
		readonly input: AList<A>,
		readonly output: B,
		readonly getFunc: (func: IFA<AList<A>, B>) => IFA<AList<A>, B>,
		readonly memo: WeakMap<$T<A>, $T<B>>,
	) {
		this.evaluate = this.evaluate.bind(this);
		this.forward = this.forward.bind(this);
	}

	private get func(): IFA<AList<A>, B> {
		if (this._func) return this._func;
		const func = this.getFunc(this);
		if (!func) {
			throw new Error("get func: failed");
		}
		this._func = func;
		return func;
	}

	evaluate(x: $T<AList<A>>): $T<B> {
		if (x === null) {
			return this.func.evaluate(x);
		}
		const memoed = this.memo.get(x);
		if (memoed) {
			return memoed;
		}
		const toAdd = this.func.evaluate(x);
		this.memo.set(x, toAdd);
		return toAdd;
	}

	forward(x: $T<AList<A>>, dx: $D<AList<A>>) {
		return this.func.forward(x, dx);
	}
}

export class FList<A extends $A> {
	constructor(
		readonly list: AList<A>,
		readonly fUnion = new FUnion(list),
		readonly fCons = new FProduct(list.shape.cons),
		readonly inner: A = list.shape.cons.shape.head,
	) {}

	memoedRec<B extends $A>(
		input: AList<A>,
		output: B,
		getFunc: (rec: IFA<AList<A>, B>) => IFA<AList<A>, B>,
		memo = new WeakMap<Cons<$T<A>>, $T<B>>(),
	): IFA<AList<A>, B> {
		return new MemoedRec(input, output, getFunc, memo);
	}

	cons(): IFA<APair<A, AList<A>>, AList<A>> {
		const input: APair<A, AList<A>> = pair(this.inner, this.list);
		const fInput = new FPair(input);
		return composeA(
			this.fCons.introA(input, {
				head: fInput.fst(),
				tail: fInput.snd(),
			}),
			this.fUnion.introCase("cons"),
		);
	}

	filter(pred: (x: $T<A>) => boolean): IFA<AList<A>, AList<A>> {
		const { nil, cons } = this.list.shape;
		const fCons = this.fCons;
		const fromRec = (rec: IFA<AList<A>, AList<A>>): IFA<AList<A>, AList<A>> => {
			const consCase = fCons.introA(cons, {
				head: fCons.get("head"),
				tail: composeA(fCons.get("tail"), rec),
			});
			return this.fUnion.elimA(this.list, {
				nil: constant(nil, this.list, null),
				cons: condA(
					(x) => pred(x.head),
					composeA(
						trimA(
							consCase,
							(c1, c2) =>
								Object.is(c1.head, c2.head) && Object.is(c1.tail, c2.tail),
						),
						this.fUnion.introCase("cons"),
					),
					composeA(fCons.get("tail"), rec),
				),
			});
		};
		return this.memoedRec(this.list, this.list, fromRec);
	}

	map<B extends $A>(func: IFA<A, B>): IFA<AList<A>, AList<B>> {
		const listOut = list(func.output);
		const { nil, cons } = this.list.shape;
		const fConsIn = this.fCons;
		const fConsOut = new FProduct(listOut.shape.cons);
		const fUnionOut = new FUnion(listOut);
		const fromRec = (rec: IFA<AList<A>, AList<B>>): IFA<AList<A>, AList<B>> => {
			return this.fUnion.elimA(listOut, {
				nil: constant(nil, listOut, null),
				cons: composeA(
					fConsOut.introA(cons, {
						head: composeA(fConsIn.get("head"), func),
						tail: composeA(fConsIn.get("tail"), rec),
					}),
					fUnionOut.introCase("cons"),
				),
			});
		};
		return this.memoedRec(this.list, listOut, fromRec);
	}
}
