import type { Patches } from "@/patch";
import type { IF } from "@/types";

export const withDebugPrint = <
	A,
	B,
	DA = Patches<A>,
	DB = Patches<B>,
	F extends boolean = boolean,
>(
	label: string,
	f: IF<A, B, DA, DB, F>,
): IF<A, B, DA, DB, F> => {
	return {
		evaluate: (x: A) => {
			const y = f.evaluate(x);
			console.log(`${label}:debug:evaluate`, x, y);
			return y;
		},
		forward: (x: A, dx: DA, y?: B): DB => {
			console.log(`${label}:debug:forward:values`, x, y);
			const dy = f.forward(x, dx, y as never);
			console.log(`${label}:debug:forward:changes`, dx, dy);
			return dy;
		},
	};
};
