// biome-ignore-all lint/suspicious/noExplicitAny: WIP
// @ts-nocheck
// TODO finish this class
import { composeA } from "@/funcs";
import type { APair } from "@/pair";
import type { AnyTuple, ATuple } from "@/tuple/tuple";
import type { $A, $D, $T } from "@/types/abbr";
import type { IF1, IFA } from "@/types/func";

type ChainEntry =
	| {
			type: "IFA";
			func: IFA<$A, $A>;
	  }
	| {
			type: "IF";
			func: IF1<$A, $A>;
	  };

export type InferIfChainOutput<
	Residuals extends AnyTuple<$A>,
	Output extends $A,
> = Residuals extends [] ? Output : APair<Output, ATuple<Residuals>>;
export class IFChain<
	Input extends $A,
	Output extends $A,
	Residuals extends AnyTuple<$A>,
> implements IF1<Input, InferIfChainOutput<Residuals, Output>>
{
	private constructor(
		readonly input: Input,
		readonly chain: ChainEntry[],
		readonly hasResidual = this.chain.findIndex(
			({ type }) => type !== "IFA",
		) !== -1,
		// readonly output = hasResidual ? tuple(this.chain.flatMap((e) => e.type === 'IFA' ? [] : e.type == 'IF' ? : e.output.shape[0])) : tuple([]),
	) {}

	static create<Input extends $A>(): IFChain<Input, Input, []> {}

	addIFA<B extends $A>(func: IFA<Output, B>): IFChain<Input, B, Residuals> {
		if (this.chain.length > 0) {
			const last = this.chain[this.chain.length - 1];
			if (last?.type === "IFA") {
				return new IFChain(
					[
						...this.chain.slice(0, this.chain.length - 1),
						{ type: "IFA", func: composeA(last.func, func) },
					],
					this.hasResidual,
				);
			}
		}
		return new IFChain(
			[...this.chain, { type: "IFA", func }],
			this.hasResidual,
		);
	}
	addIF<B extends $A>(
		func: IF1<Output, B>,
	): IFChain<Input, B, [...Residuals, B]> {
		return new IFChain([...this.chain, { type: "IF", func }], false);
	}
	addIFR<B extends $A, R extends $A>(
		_f: IF1<Output, APair<B, R>>,
	): IFChain<Input, B, [...Residuals, APair<B, R>]> {
		return new IFChain(
			[
				...this.chain,
				{ type: "IF", func },
				{ type: "IFA", func: new FPair(func.output.shape).fst() },
			],
			false,
		);
	}

	evaluate(input: $T<Input>): $T<InferIfChainOutput<Residuals, Output>> {
		let acc: any = input;
		if (!this.hasResidual) {
			for (const entry of this.chain) {
				const func = entry.func as IFA<$A, $A>;
				acc = func.evaluate(acc);
			}
			return acc;
		}

		const res: any[] = [];
		for (const entry of this.chain) {
			const { type, func } = entry;
			if (type === "IFA") {
				acc = func.evaluate(acc);
			} else {
				acc = func.evaluate(acc);
			}
		}

		return [acc, res];
	}

	forward(
		input: $T<Input>,
		dInput: $D<Input>,
		output: InferIfChainOutput<Residuals, Output>,
	): $D<InferIfChainOutput<Residuals, Output>> {
		let acc: any = input;
		let dAcc: any = dInput;
		if (!this.hasResidual) {
			for (const entry of this.chain) {
				const func = entry.func as IFA<$A, $A>;
				dAcc = func.forward(acc, dAcc);
				acc = func.evaluate(acc);
			}
			return dAcc;
		}

		let k = 0;
		const [_y, ys] = output as never as [any, any[]];
		const dRes = ys.map((_x) => null);
		for (const entry of this.chain) {
			const { type, func } = entry;
			if (type === "IFA") {
				dAcc = func.forward(acc, dAcc);
				acc = func.evaluate(acc);
			} else {
				const acc1 = ys[k];
				dAcc = func.forward(acc1, dAcc, ys[k++]);
				acc = acc1;
			}
		}

		return [dAcc, dRes];
	}
}
