import { identity } from "@/builder";
import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import * as Option from "@/builder/option";
import * as S from "@/builder/struct";
import { assignWith } from "@/builder/struct/assign";
import type { Path } from "@/patch";
import { applyGetOpt } from "@/patch/access";
import type { AnyIF, IF } from "@/types";
import { type ILens, type IPrism, OpticsKind } from "./types";

const makeSet =
	<Input extends WeakKey, Output>(path: Path) =>
	(func: IF<Output, Output>): IF<Input, Input> =>
		// biome-ignore lint/suspicious/noExplicitAny: can't be checked
		assignWith<any, any>([{ path, getValue: func as AnyIF }]);

export const accessPath = <Output, Input extends WeakKey>(
	path: Path,
): ILens<Input, Output> => ({
	kind: OpticsKind.Lens,
	get: S.accessPathFor<Input>()<Path, Output>(path),
	set: makeSet(path),
});

export const accessPathOpt1 = <Output, Input extends WeakKey>(
	path: Path,
): IPrism<Input, Output> => ({
	kind: OpticsKind.Prism,
	getOpt: composeMemo(
		S.accessPathOpt<Output, Input>(path),
		Option.fromDefined(),
	),
	set: (func: IF<Output, Output>): IF<Input, Input> =>
		condSingle(
			(input: Input) => applyGetOpt(input, path) !== undefined,
			makeSet<Input, Output>(path)(func),
			identity(),
		),
});
