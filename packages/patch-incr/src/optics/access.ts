import { identity } from "@/builder";
import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import * as Option from "@/builder/option";
import * as S from "@/builder/struct";
import { assignWith } from "@/builder/struct/assign";
import type { AccessPath, AccessPathOpt } from "@/builder/typeHelpers";
import type { Path } from "@/patch";
import { applyGetOpt } from "@/patch/access";
import type { AnyIF, IF } from "@/types";
import { type ILens, type IPrism, OpticsKind } from "./types";

const makeSetter =
	<Input extends WeakKey, Output>(path: Path) =>
	(func: IF<Output, Output>): IF<Input, Input> =>
		// biome-ignore lint/suspicious/noExplicitAny: can't be checked
		assignWith<any, any>([
			{
				path,
				getValue: composeMemo(
					S.accessPathFor<Input>()<Path, Output>(path),
					func,
				) as AnyIF,
			},
		]);

export const accessPath =
	<Input extends WeakKey>() =>
	<P extends Path, Output extends AccessPath<Input, P> = AccessPath<Input, P>>(
		path: [...P],
	): ILens<Input, Output, P> => ({
		kind: OpticsKind.Lens,
		get: S.accessPathFor<Input>()<Path, Output>(path),
		set: makeSetter(path),
	});

export const accessPathOpt1 =
	<Input extends WeakKey>() =>
	<
		P extends Path,
		Output extends AccessPathOpt<Input, P> = AccessPathOpt<Input, P>,
	>(
		path: [...P],
	): IPrism<Input, Output, { opt: P }> => ({
		kind: OpticsKind.Prism,
		getOpt: composeMemo(
			S.accessPathOpt<Output, Input>(path),
			Option.fromDefined(),
		),
		set: (func: IF<Output, Output>): IF<Input, Input> =>
			condSingle(
				(input: Input) => applyGetOpt(input, path) !== undefined,
				makeSetter<Input, Output>(path)(func),
				identity(),
			),
	});
