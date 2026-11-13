import { describe } from "bun:test";
import * as f from "@/funcs";
import { makeIFR } from "@/funcs/helpers";
import * as s from "@/index";
import * as p from "@/props";
import { testCasesIFR } from "../fastCheck/testPropsIF.test";

const dupR = <A extends s.$A>(input: A): s.IFR<A, A, A> => {
	const out = s.pair(input, input);
	return makeIFR(input, input, input, {
		evaluate: (x) => [x, x],
		forward: (_x, dx, _out) => {
			return out.trim([dx, dx]);
		},
	});
};

const withConstR =
	<A extends s.$A>(input: A) =>
	<B extends s.$A, R extends s.$A>(
		func: s.IFA<A, B> | s.IF1<A, B>,
		residual: R,
		rv: s.$T<R>,
	): s.IFR<A, B, R> => {
		const out = s.pair(input, residual);
		return makeIFR(input, func.output, residual, {
			evaluate: (x) => [func.evaluate(x), rv],
			forward: (x, dx, [y, _out]) => {
				return out.trim([func.forward(x, dx, y), residual.empty]);
			},
		});
	};

describe("composeR counterexamples", () => {
	const input = p.boolean();
	const idcr = f.composeR(dupR(input), dupR(input));
	const ccr = f.composeR(
		withConstR(input)(f.identity(input), s.nullType(), null),
		withConstR(input)(f.identity(input), s.nullType(), null),
	);
	describe("idcr", () => {
		testCasesIFR(idcr);
	});
	describe("ccr", () => {
		testCasesIFR(ccr);
	});
});
