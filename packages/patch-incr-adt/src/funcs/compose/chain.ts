import type { $A } from "@/types/abbr";
import type { IF } from "@/types/func";
import { composeNonOverload } from "../basic";

export class Composer<
	F extends IF<A, B>,
	A extends $A = F["input"],
	B extends $A = F["output"],
> {
	constructor(readonly func: F) {}

	compose<F1 extends IF<B, C>, C extends $A = F1["output"]>(
		other: F1,
	): Composer<IF<A, C>, A, C> {
		return new Composer(composeNonOverload(this.func, other));
	}

	build(): F {
		return this.func;
	}
}
