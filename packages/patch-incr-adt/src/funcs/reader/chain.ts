import type { $A } from "@/types";
import { compose, getTypes, type IReader } from "./reader";

export class ReaderComposer<Ctx extends $A, A extends $A, B extends $A> {
	constructor(readonly func: IReader<Ctx, A, B>) {}

	pipe<C extends $A>(
		next: IReader<Ctx, B, C> | ((out: B) => IReader<Ctx, B, C>),
	): ReaderComposer<Ctx, A, C> {
		const out: B = getTypes(this.func)[2];
		return new ReaderComposer<Ctx, A, C>(
			compose<Ctx, A, B, C>(
				this.func,
				typeof next === "function" ? next(out) : next,
			),
		);
	}

	build() {
		return this.func;
	}
}

export const composer = <Ctx extends $A, A extends $A, B extends $A>(
	func: IReader<Ctx, A, B>,
) => new ReaderComposer<Ctx, A, B>(func);
