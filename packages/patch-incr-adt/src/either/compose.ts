import type { $A, IFA } from "@/types";
import type { AEither } from "./types";

export const composeResultA =
	<E extends $A>(_e: E) =>
	<A extends $A, B extends $A, C extends $A>(
		_left: IFA<A, AEither<E, B>>,
		_right: IFA<B, AEither<E, C>>,
	): IFA<A, AEither<E, B>> => {
		throw new Error("TODO");
	};

export const composeResultDA = <
	A extends $A,
	E1 extends $A,
	B extends $A,
	E2 extends $A,
	C extends $A,
>(
	_left: IFA<A, AEither<E1, B>>,
	_right: IFA<B, AEither<E2, C>>,
): IFA<A, AEither<AEither<E1, E2>, B>> => {
	throw new Error("TODO");
};
