import { type AOption, type ASome, option } from "@/option";
import type { $A } from "@/types/abbr";
import type { IFA } from "@/types/func";
import type { AUnion } from "@/union";
import { composeA, constant, identity } from "./basic";
import { FRecord } from "./product";
import { FUnion } from "./union";

export class FOption<A extends $A> {
	constructor(
		readonly type: A,
		readonly opt: AOption<A> = option(type),
		readonly fUnion = new FUnion(opt),
		readonly fSome = new FRecord(opt.shape.some),
	) {}
	/** `x => { value: x } as Option<A>` */
	some(): IFA<A, AOption<A>> {
		const makeSome: IFA<A, ASome<A>> = this.fSome.introA(this.type, {
			value: identity(this.type),
		});
		const someToOptional: IFA<ASome<A>, AOption<A>> = this.fUnion.introCase(
			"some",
		);
		return composeA(makeSome, someToOptional);
	}

	/** `_ => null as Option<A>` */
	none<T extends $A>(t: T): IFA<T, AOption<A>> {
		return constant(t, this.opt, null);
	}
}

declare module "./union" {
	interface FUnion<
		Shape extends Record<Key, $A>,
		Key extends keyof Shape = keyof Shape,
	> {
		preview<K extends Key>(key: K): IFA<AUnion<Shape, Key>, AOption<Shape[K]>>;
	}
}

FUnion.prototype.preview = function <
	Shape extends Record<Key, $A>,
	Key extends keyof Shape,
	K extends Key,
>(
	this: FUnion<Shape, Key>,
	key: K,
): IFA<AUnion<Shape, Key>, AOption<Shape[K]>> {
	const { shape, keys } = this.union;
	const fopt = new FOption(shape[key]);
	const output = option(shape[key]);
	const funcs = {} as { [key1 in Key]: IFA<Shape[key1], AOption<Shape[K]>> };
	for (const key1 of keys) {
		if (key1 === key) {
			funcs[key] = fopt.some();
		} else {
			funcs[key] = fopt.none<Shape[K]>(shape[key]);
		}
	}
	return this.elimA<AOption<Shape[K]>>(output, funcs);
};
