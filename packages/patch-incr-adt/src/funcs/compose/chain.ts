import type { APair } from "@/pair";
import type { $A } from "@/types/abbr";
import type { IF, IF1, IFA, IFR } from "@/types/func";
import { composeNonOverload } from "../basic";

// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentional
export class Composer<
	F extends IF<A, B>,
	A extends $A = F["input"],
	B extends $A = F["output"],
> {
	constructor(readonly func: F) {}

	// biome-ignore lint/suspicious/noExplicitAny: intentional
	compose(other: any): Composer<any, any, any> {
		return new Composer(composeNonOverload(this.func, other));
	}

	build(): F {
		return this.func;
	}
}

export interface Composer<
	F extends IF<A, B>,
	A extends $A = F["input"],
	B extends $A = F["output"],
> {
	// IFA
	compose<A extends $A, B extends $A, C extends $A>(
		this: Composer<IFA<A, B>, A, B>,
		f2: IFA<B, C>,
	): Composer<IFA<A, C>>;
	compose<A extends $A, B extends $A, C extends $A>(
		this: Composer<IFA<A, B>, A, B>,
		f2: IF1<B, C>,
	): Composer<IF1<A, C>>;
	compose<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IFA<A, B>, A, B>,
		f2: IFR<B, C, R>,
	): Composer<IFR<A, C, R>, A, C>;

	// IF1
	compose<A extends $A, B extends $A, C extends $A>(
		this: Composer<IF1<A, B>, A, B>,
		f2: IFA<B, C>,
	): Composer<IFR<A, C, B>, A, C>;
	compose<A extends $A, B extends $A, C extends $A>(
		this: Composer<IF1<A, B>, A, B>,
		f2: IF1<B, C>,
	): Composer<IFR<A, C, B>, A, C>;
	compose<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IF1<A, B>, A, B>,
		f2: IFR<B, C, R>,
	): Composer<IFR<A, C, APair<B, R>>, A, C>;

	// IFR
	compose<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IFR<A, B, R>, A, B>,
		f2: IFA<B, C>,
	): Composer<IFR<A, C, APair<B, R>>, A, C>;
	compose<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IFR<A, B, R>, A, B>,
		f2: IF1<B, C>,
	): Composer<IFR<A, C, APair<B, R>>, A, C>;
	compose<
		A extends $A,
		B extends $A,
		C extends $A,
		R1 extends $A,
		R2 extends $A,
	>(
		this: Composer<IFR<A, B, R1>, A, B>,
		f2: IFR<B, C, R2>,
	): Composer<IFR<A, C, APair<APair<B, R1>, R2>>, A, C>;

	// General
	compose<A extends $A, B extends $A, C extends $A>(
		this: Composer<IF<A, B>, A, B>,
		f2: IF<B, C>,
	): Composer<IF<A, C>, A, C>;
}
