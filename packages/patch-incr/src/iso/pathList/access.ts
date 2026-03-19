import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import * as S from "@/builder/struct";
import * as A from "@/builder/struct/access";
import type { Path } from "@/patch";
import { pathEquals, pathIsPrefix } from "@/patch/helpers";
import { empty } from "./builder";
import {
	type AcceptPath,
	type ByPath,
	IsParentPath,
	type PathListOptics,
} from "./types";

const acceptPathAccessPath =
	(path: Path): AcceptPath =>
	(path1: Path) => {
		if (pathEquals(path, path1)) {
			return [];
		}
		if (pathIsPrefix(path, path1)) {
			return path1.slice(path.length);
		}
		if (pathIsPrefix(path1, path)) {
			return IsParentPath;
		}
		return null;
	};

export const accessPath = <Output, Input extends WeakKey>(
	path: Path,
): PathListOptics<Input, Output> => ({
	func: composeMemo(
		S.accessPath<Output, Input>(path),
		S.template0((x: Output) => [[path, x]]),
	),
	acceptPath: acceptPathAccessPath(path),
});

export const accessPathFor = (() => accessPath) as never as <Input>() => <
	Output,
>(
	path: Path,
) => PathListOptics<Input, Output>;

export const accessPathOpt = <Output, Input extends WeakKey>(
	path: Path,
): PathListOptics<Input, Output> => ({
	func: composeMemo(
		A.accessPathOpt<Output, Input>(path),
		condSingle(
			(x: Output | undefined) => !!x,
			S.template0((x: Output): ByPath<Output> => [[path, x]]),
			empty<undefined, Output>().func,
		),
	),
	acceptPath: acceptPathAccessPath(path),
});
