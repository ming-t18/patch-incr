import * as Arr from "@/builder/array";
import { mapIndexed } from "@/builder/array/mapIndexed";
import { composeMemo } from "@/builder/compose";
import * as Pair from "@/builder/pair";
import { template0 } from "@/builder/struct";
import type { Path } from "@/patch";
import type { AcceptPath, PathListOptics } from "./types";

const acceptPath0: AcceptPath = (path: Path) => {
	if (path.length === 0) {
		return path;
	}

	return path.slice(1);
};

export const all = <T>(): PathListOptics<T[], T> => ({
	func: mapIndexed<T, [Path, T]>(
		Pair.first(template0((x: number): Path => [x])),
	),
	acceptPath: acceptPath0,
});

export const where = <T>(
	pred: (value: T) => boolean,
): PathListOptics<T[], T> => ({
	func: composeMemo(
		all<T>().func,
		Arr.filter(([_path, value]) => pred(value)),
		Pair.fst(),
	),
	acceptPath: acceptPath0,
});
