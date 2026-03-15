import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import * as S from "@/builder/struct";
import * as A from "@/builder/struct/access";
import type { Path } from "@/patch";
import { empty } from "./builder";
import type { ByPath, PathListOptics } from "./types";

export const accessPath = <Output, Input extends WeakKey>(
	path: Path,
): PathListOptics<Input, Output> =>
	composeMemo(
		S.accessPath<Output, Input>(path),
		S.template0((x: Output) => [[path, x]]),
	);

export const accessPathFor = (() => accessPath) as never as <Input>() => <
	Output,
>(
	path: Path,
) => PathListOptics<Input, Output>;

export const accessPathOpt = <Output, Input extends WeakKey>(
	path: Path,
): PathListOptics<Input, Output> =>
	composeMemo(
		A.accessPathOpt<Output, Input>(path),
		condSingle(
			(x: Output | undefined) => !!x,
			S.template0((x: Output): ByPath<Output> => [[path, x]]),
			empty<undefined, Output>(),
		),
	);
