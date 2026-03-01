import type { List } from "immutable";

export type Measure<T, M> = {
	measure: (value: T) => M;
	readonly zero: M;
	combine: (left: M, right: M) => M;
};

export type MeasureList<T, M> = (
	list: List<T>,
	start?: number,
	end?: number,
) => M;
