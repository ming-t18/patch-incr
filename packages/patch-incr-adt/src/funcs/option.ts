import { type AOption, type ASome, option } from "@/option";
import type { $A } from "@/types/abbr";
import type { IFA } from "@/types/func";
import { composeA, constant, identity } from "./basic";
import { FRecord } from "./product";
import { FUnion } from "./union";

export class FOptional<A extends $A> {
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
