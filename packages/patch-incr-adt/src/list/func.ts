import { composeA, condA, constant, FProduct, FUnion, trimA } from "@/funcs";
import type { $A, $D, $T } from "@/types/abbr";
import { type IFA, IFKind } from "@/types/func";
import { type AList, type Cons, list } from "./prod";

export class FList<A extends $A> {
	constructor(
		readonly list: AList<A>,
		readonly union = new FUnion(list),
	) {}

	memoedRec<B extends $A>(
		input: AList<A>,
		output: B,
		getFunc: (rec: IFA<AList<A>, B>) => IFA<AList<A>, B>,
		memo = new WeakMap<Cons<$T<A>>, $T<B>>(),
	): IFA<AList<A>, B> {
		class MemoedRec implements IFA<AList<A>, B> {
			readonly input = input;
			readonly output = output;
			readonly kind = IFKind.IFA;
			private _func: ReturnType<typeof getFunc> | null = null;
			private get func(): ReturnType<typeof getFunc> {
				if (this._func) return this._func;
				const func = getFunc(this);
				this._func = func;
				return func;
			}

			evaluate(x: $T<AList<A>>): $T<B> {
				const func = this.func;
				if (x === null) {
					return func.evaluate(x);
				}
				const memoed = memo.get(x);
				if (memoed) {
					return memoed;
				}
				const toAdd = func.evaluate(x);
				memo.set(x, toAdd);
				return toAdd;
			}
			forward(x: $T<AList<A>>, dx: $D<AList<A>>) {
				return this.func.forward(x, dx);
			}
		}
		return new MemoedRec();
	}

	filter(pred: (x: $T<A>) => boolean): IFA<AList<A>, AList<A>> {
		const { nil, cons } = this.list.shape;
		const fCons = new FProduct(cons);
		const fromRec = (rec: IFA<AList<A>, AList<A>>): IFA<AList<A>, AList<A>> => {
			const consCase = fCons.introA(cons, {
				head: fCons.get("head"),
				tail: composeA(fCons.get("tail"), rec),
			});
			return this.union.elimA(this.list, {
				nil: constant(nil, this.list, null),
				cons: condA(
					(x) => pred(x.head),
					composeA(
						// TODO decompose -> func -> compose needs to detect no-op changes
						trimA(
							consCase,
							(c1, c2) =>
								Object.is(c1.head, c2.head) && Object.is(c1.tail, c2.tail),
						),
						this.union.introCase("cons"),
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
		const fConsIn = new FProduct(cons);
		const fConsOut = new FProduct(listOut.shape.cons);
		const fUnionOut = new FUnion(listOut);
		const fromRec = (rec: IFA<AList<A>, AList<B>>): IFA<AList<A>, AList<B>> => {
			return this.union.elimA(listOut, {
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
