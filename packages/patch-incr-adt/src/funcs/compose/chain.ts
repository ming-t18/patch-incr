import type { APair } from "@/pair";
import type { $A } from "@/types/abbr";
import type { IF, IF1, IFA, IFOutput, IFR } from "@/types/func";
import { composeNonOverload, getOutput } from "../basic";

// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentional
export class Composer<
	F extends IF<A, B>,
	A extends $A = F["input"],
	B extends $A = IFOutput<F>,
> {
	constructor(readonly func: F) {}

	static create<
		F extends IF<A, B>,
		A extends $A = F["input"],
		B extends $A = IFOutput<F>,
	>(func: F): Composer<F, A, B> {
		return new Composer(func);
	}

	pipe<C extends $A>(
		next: IF<B, C> | ((out: B) => IF<B, C>),
	): Composer<IF<A, C>> {
		return new Composer(
			composeNonOverload(
				this.func,
				typeof next === "function" ? next(getOutput(this.func)) : next,
			),
		);
	}

	build(): F {
		return this.func;
	}
}

export const composer = <
	F extends IF<A, B>,
	A extends $A = F["input"],
	B extends $A = IFOutput<F>,
>(
	f: F,
) => Composer.create<F, A, B>(f);

export interface Composer<
	F extends IF<A, B>,
	A extends $A = F["input"],
	B extends $A = IFOutput<F>,
> {
	// IFA
	pipe<A extends $A, B extends $A, C extends $A>(
		this: Composer<IFA<A, B>, A, B>,
		f2: (out: B) => IFA<B, C>,
	): Composer<IFA<A, C>>;
	pipe<A extends $A, B extends $A, C extends $A>(
		this: Composer<IFA<A, B>, A, B>,
		f2: IF1<B, C> | ((out: B) => IF1<B, C>),
	): Composer<IF1<A, C>>;
	pipe<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IFA<A, B>, A, B>,
		f2: (out: B) => IFR<B, C, R>,
	): Composer<IFR<A, C, R>, A, C>;

	// IF1
	pipe<A extends $A, B extends $A, C extends $A>(
		this: Composer<IF1<A, B>, A, B>,
		f2: IFA<B, C> | ((out: B) => IFA<B, C>),
	): Composer<IFR<A, C, B>, A, C>;
	pipe<A extends $A, B extends $A, C extends $A>(
		this: Composer<IF1<A, B>, A, B>,
		f2: IF1<B, C> | ((out: B) => IF1<B, C>),
	): Composer<IFR<A, C, B>, A, C>;
	pipe<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IF1<A, B>, A, B>,
		f2: IFR<B, C, R> | ((out: B) => IFR<B, C, R>),
	): Composer<IFR<A, C, APair<B, R>>, A, C>;

	// IFR
	pipe<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IFR<A, B, R>, A, B>,
		f2: IFA<B, C> | ((out: B) => IFA<B, C>),
	): Composer<IFR<A, C, APair<B, R>>, A, C>;
	pipe<A extends $A, B extends $A, C extends $A, R extends $A>(
		this: Composer<IFR<A, B, R>, A, B>,
		f2: IF1<B, C> | ((out: B) => IF1<B, C>),
	): Composer<IFR<A, C, APair<B, R>>, A, C>;
	pipe<A extends $A, B extends $A, C extends $A, R1 extends $A, R2 extends $A>(
		this: Composer<IFR<A, B, R1>, A, B>,
		f2: IFR<B, C, R2> | ((out: B) => IFR<B, C, R2>),
	): Composer<IFR<A, C, APair<APair<B, R1>, R2>>, A, C>;

	// General
	pipe<A extends $A, B extends $A, C extends $A>(
		this: Composer<IF<A, B>, A, B>,
		f2: IF<B, C> | ((out: B) => IF<B, C>),
	): Composer<IF<A, C>, A, C>;
}
