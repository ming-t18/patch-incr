import { type $A, type $D, type $T, type IF, IFKind, type IFR } from "@/types";

/**
 * Evaluates and forwards an `IF`.
 * Returns the output and the change in output.
 * Also includes residual and its change if applicable.
 */
export const evaluateAndForward = <
	A extends $A,
	B extends $A,
	R extends $A = $A,
>(
	func: IF<A, B> | IFR<A, B, R>,
	x: $T<A>,
	dx: $T<B>,
): { y: $T<B>; dy: $D<B>; r?: $T<R>; dr?: $D<R> } => {
	if (func.kind === IFKind.IFR) {
		const [y, r] = func.evaluate(x);
		const dyr = func.forward(x, dx, y);
		const [dy, dr] = func.output.project(null, dyr);
		return { y, dy, r, dr };
	}
	const y = func.evaluate(x);
	const dy = func.forward(x, dx, y);
	return { y, dy };
};

/**
 * Evaluates an `IF`.
 * Returns the output and if applicable, the residual.
 */
export const evaluateIF = <A extends $A, B extends $A, R extends $A = $A>(
	func: IF<A, B> | IFR<A, B, R>,
	x: $T<A>,
): { y: $T<B>; r?: $T<R> } => {
	if (func.kind === IFKind.IFR) {
		const [y, r] = func.evaluate(x);
		return { y, r };
	}
	const y = func.evaluate(x);
	return { y };
};
