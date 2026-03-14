import * as Arr from "@/builder/array";
import { mapIndexed } from "@/builder/array/mapIndexed";
import { composeMemo } from "@/builder/compose";
import * as Pair from "@/builder/pair";
import { template0 } from "@/builder/struct";
import type { Path } from "@/patch";
import type { PathListOptics } from "./types";

export const all = <T>(): PathListOptics<T[], T> => {
	return mapIndexed<T, [Path, T]>(
		Pair.first(template0((x: number): Path => [x])),
	);
};

export const where = <T>(
	pred: (value: T) => boolean,
): PathListOptics<T[], T> => {
	return composeMemo(
		all(),
		Arr.filter(([_path, value]) => pred(value)),
		Pair.fst(),
	);
};
