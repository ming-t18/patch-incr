import type { $A } from "@/types";
import { compose, getTypes, type IReader } from ".";

export class IReaderComposer<Ctx extends $A, A extends $A, B extends $A> {
	constructor(readonly func: IReader<Ctx, A, B>) {}

	pipe<C extends $A>(
		getNext: (b: B) => IReader<Ctx, B, C>,
	): IReaderComposer<Ctx, A, C> {
		const out: B = getTypes(this.func)[2];
		return new IReaderComposer(compose(this.func, getNext(out)));
	}

	build() {
		return this.func;
	}
}
