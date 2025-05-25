import { type IFRO, applyReplaceOnly } from "../algebra/replaceOnly";
import type { InferIFInput } from "../incr/types";
import { atomic, atomicCell, composeWeakMemo, joinTuple } from "../memo";
import type { Cell } from "../memo/memoFn";
import { tuple } from "../memo/tuple";

describe("memo", () => {
	const sum2 = (x: Cell<number>, y: Cell<number>) => ({
		value: x.value + y.value,
	});
	const fst: IFRO<[Cell<number>, Cell<number>], Cell<number>> = atomic(
		(x: [Cell<number>, Cell<number>]): Cell<number> => x[0],
		applyReplaceOnly(),
		applyReplaceOnly(),
	);
	const snd: typeof fst = atomic(
		(x: [Cell<number>, Cell<number>]): Cell<number> => x[1],
		applyReplaceOnly(),
		applyReplaceOnly(),
	);
	const square: IFRO<Cell<number>, Cell<number>> = atomicCell(
		(x: number) => x * x,
	);
	const c1 = composeWeakMemo(fst, square);
	const c2 = composeWeakMemo(snd, square);
	const fork = tuple(
		[c1, c2] as const,
		applyReplaceOnly<InferIFInput<typeof fst>>(),
	);
	const squares = composeWeakMemo(
		fork,
		// @ts-expect-error TODO fix this
		joinTuple(sum2, applyReplaceOnly(), applyReplaceOnly()),
	);
	const seq1 = atomicCell<number, number[]>((x) => {
		console.log("called seq1", x);
		return Array(x)
			.fill(null)
			.map((_, i) => i);
	});
	const sum = atomicCell<number[], number>((x) => {
		console.log("called sum", x);
		return x.reduce((a, b) => a + b, 0);
	});
	const composed = composeWeakMemo(seq1, sum);
	it("test", () => {
		const x1: Cell<number> = { value: 10 };
		console.log(composed.invoke(x1));
		console.log(composed.invoke(x1));
		// console.log(composed.invoke(x2));
	});
});
