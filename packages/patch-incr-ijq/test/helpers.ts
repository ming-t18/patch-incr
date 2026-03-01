import { applyPatches, type Patches } from "patch-incr/patch";
import * as A from "@/arrow";
import type { EmptyCtx, Ijq } from "@/type";

export const propIjqPatchCoherentNoCtx = <Input extends WeakKey, Output>(
	x: Input,
	dx: Patches<Input>,
	f: Ijq<Input, Output, EmptyCtx>,
) => {
	const func = A.toIFNoCtx(f);
	const x1 = applyPatches(x, dx);
	const y = func.evaluate(x);
	const dy = func.forward(x, dx, y);
	const y1Actual = applyPatches(y, dy);
	const y1Expected = func.evaluate(x1);
	expect(y1Actual).toStrictEqual(y1Expected);
};

export const propIjqPatchCoherent = <
	Input extends WeakKey,
	Output,
	Ctx extends {} = EmptyCtx,
>(
	x: [Input, Ctx],
	dx: Patches<[Input, Ctx]>,
	f: Ijq<Input, Output, Ctx>,
) => {
	const func = A.toIF(f);
	const x1 = applyPatches(x, dx);
	const y = func.evaluate(x);
	const dy = func.forward(x, dx, y);
	const y1Actual = applyPatches(y, dy);
	const y1Expected = func.evaluate(x1);
	expect(y1Actual).toStrictEqual(y1Expected);
};
