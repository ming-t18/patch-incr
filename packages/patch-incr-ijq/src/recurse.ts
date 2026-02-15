import type { AnyIF } from "patch-incr/types";
import * as A from "./arrow";
import * as Stream from "./stream";
import { type EmptyCtx, FuncKind, type Ijq } from "./type";

export const fix = <A, B, Ctx extends {} = EmptyCtx>(
	builder: (func: Ijq<A, B, Ctx>) => Ijq<A, B, Ctx>,
	kind = FuncKind.Multiple,
): Ijq<A, B, Ctx> => {
	const target: AnyIF = {
		evaluate: () => {
			throw new Error("Ijq.fix: evaluate is called");
		},
		forward: () => {
			throw new Error("Ijq.fix: forward is called");
		},
	};
	const func: AnyIF = {
		evaluate: (x: unknown) => {
			return target.evaluate(x);
		},
		forward: (x: unknown, y: unknown, z: unknown) => {
			return target.forward(x, y, z);
		},
	} as never;
	const unassigned: Ijq<A, B, Ctx> = { kind, func } as never;
	const res = builder(unassigned);
	const { evaluate, forward } = res.func;
	target.evaluate = evaluate;
	target.forward = forward;
	return unassigned;
};

/** JQ: `recurse(FUNC)` */
export const recurse = <A extends WeakKey, Ctx extends {} = EmptyCtx>(
	func: Ijq<A, A, Ctx>,
): Ijq<A, A, Ctx> => {
	return fix<A, A, Ctx>((r) => Stream.concat(func, A.compose(func, r)));
};
