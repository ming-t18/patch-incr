// biome-ignore-all lint/style/noNonNullAssertion: for checked array access

import { type Apply, ApplyError } from "@/types";

/** Mapping: `[i, di) -> [j, dj)` */
export interface SpliceEntry<T> {
	readonly i: number;
	readonly di: number;
	readonly j: number;
	readonly dj: number;
	readonly replace: readonly T[];
}

/** Mapping: `[i, i+1) -> [j, j+1)` */
export interface ApplyEntry<DT> {
	readonly i: number;
	readonly di: 1;
	readonly j: number;
	readonly dj: 1;
	readonly change: DT;
}

export type SpliceTableEntry<T, DT> = SpliceEntry<T> | ApplyEntry<DT>;

export type SpliceEntries<T, DT> = readonly SpliceTableEntry<T, DT>[];

export interface ParSpliceEntry<T> {
	readonly index: number;
	readonly lenToRemove: number;
	readonly replace: readonly T[];
}

export interface ParApplyEntry<DT> {
	readonly index: number;
	readonly change: DT;
}

export type ParSpliceEntries<T, DT> = (ParSpliceEntry<T> | ParApplyEntry<DT>)[];

export enum MapResult {
	Unchanged = "Unchanged",
	Added = "Added",
	Removed = "Removed",
	Replaced = "Replaced",
}

export interface MapIndexResult<T, DT> {
	readonly index: number;
	readonly entry: SpliceTableEntry<T, DT> | null;
	readonly result: MapResult;
}

export class IndexError extends ApplyError {}

/**
 * The change-type for an array or array-like type.
 * Consists of a list of concurrent splices or internal changes.
 *
 * ## Array operations
 * All array operations can be expressed in terms of `splice`.
 *
 * For example:
 * ```typescript
 * declare const arr: T[];
 * arr.unshift(...xs);   // arr.splice(0, 1, ...xs);
 * arr.push(...xs);      // arr.splice(arr.length - 1, 1, ...xs);
 * arr.shift()           // arr.splice(0, 1);
 * arr.pop()             // arr.splice(arr.length - 1, 1);
 * arr[i] = x;           // arr.splice(i, 1, x);
 * ```
 *
 * An additional case for performing internal changes on `arr[i]` is also supported.
 * ```typescript
 * arr[i] = elemApply.apply(arr[i], change);
 * ```
 *
 * ## Representation
 * The `SpliceTable` represents the sequence of splice operations if there were performed concurrently.
 * The splice operations listed:
 *  - are sorted ascending by start index
 *  - must not overlap
 *  - must be merged with adjacent entries if possible
 *  - cannot be no-op (zero removed and zero added)
 */
export class SpliceTable<T, DT> {
	constructor(readonly entries: Readonly<SpliceEntries<T, DT>>) {}

	/** Gets the minimum array length required to apply this `SpliceTable`. */
	get requiredLength() {
		const kLast = this.entries.length - 1;
		return kLast < 0 ? 0 : this.entries[kLast]!.i + this.entries[kLast]!.di;
	}

	// region Mapping

	mapIndex(index: number): MapIndexResult<T, DT> {
		if (this.entries.length === 0) {
			return { index, entry: null, result: MapResult.Unchanged };
		}
		for (let k = 0; k < this.entries.length; k++) {
			const entry = this.entries[k]!;
			const nextEntry =
				k + 1 === this.entries.length ? null : this.entries[k + 1]!;
			if (index < entry.i) {
				return { index, entry: null, result: MapResult.Unchanged };
			}

			const iMax = entry.i + entry.di;
			if (index >= iMax) {
				if (nextEntry && index >= nextEntry.i) {
					continue;
				}
				// [i,   iMax)   ----- +off
				// [j,          jMax]  ----- +off
				const off = index - iMax;
				const jMax = entry.j + entry.dj;
				return {
					index: jMax + off,
					entry: null,
					result: MapResult.Unchanged,
				};
			}
			if (entry.dj === entry.di) {
				return {
					index: entry.j + (index - entry.i),
					entry,
					result: MapResult.Replaced,
				};
			}
			const n = entry.dj < entry.di ? entry.dj : entry.di;
			if (index < entry.i + n) {
				return {
					index: entry.j + (index - entry.i),
					entry,
					result: MapResult.Replaced,
				};
			}
			return {
				index: entry.j + entry.dj,
				entry,
				result: entry.dj < entry.di ? MapResult.Removed : MapResult.Added,
			};
		}

		const last = this.entries[this.entries.length - 1]!;
		return {
			index: index + (last.j + last.dj) - (last.i + last.di),
			entry: null,
			result: MapResult.Unchanged,
		};
	}

	unmapIndex(index: number): MapIndexResult<T, DT> {
		if (this.entries.length === 0) {
			return { index, entry: null, result: MapResult.Unchanged };
		}
		for (let k = 0; k < this.entries.length; k++) {
			const entry = this.entries[k]!;
			const nextEntry =
				k + 1 === this.entries.length ? null : this.entries[k + 1]!;
			if (index < entry.j) {
				return { index, entry: null, result: MapResult.Unchanged };
			}

			const jMax = entry.j + entry.dj;
			if (index >= jMax) {
				if (nextEntry && index >= nextEntry.j) {
					continue;
				}
				// [i,   iMax)   ----- +off
				// [j,          jMax]  ----- +off
				const off = index - jMax;
				const iMax = entry.i + entry.di;
				return {
					index: iMax + off,
					entry: null,
					result: MapResult.Unchanged,
				};
			}
			if (entry.dj === entry.di) {
				return {
					index: entry.i + (index - entry.j),
					entry,
					result: MapResult.Replaced,
				};
			}
			const n = entry.dj < entry.di ? entry.dj : entry.di;
			if (index < entry.j + n) {
				return {
					index: entry.i + (index - entry.j),
					entry,
					result: MapResult.Replaced,
				};
			}
			return {
				index: entry.i + entry.di,
				entry,
				result: entry.dj < entry.di ? MapResult.Removed : MapResult.Added,
			};
		}

		const last = this.entries[this.entries.length - 1]!;
		return {
			index: index + (last.i + last.di) - (last.j + last.dj),
			entry: null,
			result: MapResult.Unchanged,
		};
	}

	// endregion

	// region Apply

	apply(array: readonly T[], apply: Apply<T, DT>): readonly T[] {
		if (array.length < this.requiredLength) {
			throw new IndexError();
		}

		const res: T[] = [];
		let i = 0;
		for (const entry of this.entries) {
			if (entry.i > i) {
				res.push(...array.slice(i, entry.i));
				i = entry.i;
			}
			if ("change" in entry) {
				res.push(apply.apply(array[entry.i]!, entry.change));
				i += 1;
				continue;
			}

			res.push(...entry.replace);
			i += entry.di;
		}
		if (i < array.length) {
			res.push(...array.slice(i));
		}
		return res;
	}

	canApply(array: readonly T[], apply: Apply<T, DT>): boolean {
		if (array.length < this.requiredLength) {
			return false;
		}

		for (const entry of this.entries) {
			if ("change" in entry && !apply.canApply(array[entry.i]!, entry.change)) {
				return false;
			}
		}
		return true;
	}

	combineWithChange(
		index: number,
		change: DT,
		apply: Apply<T, DT>,
	): SpliceTable<T, DT> {
		const res = this.mapIndex(index);
		if (!res.entry) {
			const k = 0; // TODO
			return new SpliceTable([
				...this.entries.slice(0, k),
				...SpliceTable._applyOffset(this.entries.slice(k), 1, 1),
			]);
		}
		const k = this.entries.indexOf(res.entry);
		if ("change" in res.entry) {
			return new SpliceTable([
				...this.entries.slice(0, k),
				{ ...res.entry, change: apply.combine(res.entry.change, change) },
				...SpliceTable._applyOffset(this.entries.slice(k - 1), 1, 1),
			]);
		}
		// TODO need to split up entry
		// TODO fix this
		return new SpliceTable([
			...this.entries.slice(0, k),
			...SpliceTable._applyOffset(this.entries.slice(k), 1, 1),
		]);
	}

	private static _applyOffset<T, DT>(
		entries: SpliceTableEntry<T, DT>[],
		di: number,
		dj: number,
	): SpliceTableEntry<T, DT>[] {
		return entries.map(({ i, j, ...rest }) => ({
			i: i + di,
			j: j + dj,
			...rest,
		}));
	}

	combine(other: SpliceTable<T, DT>, apply: Apply<T, DT>): SpliceTable<T, DT> {
		const newEntries: SpliceTableEntry<T, DT>[] = [];
		let shift = 0;
		const otherEntries = splitOtherEntriesWith(this.entries, other.entries);
		for (const entry1 of otherEntries) {
			const jc = entry1.i - shift;
			if ("change" in entry1) {
				for (const entry of this.entries) {
					if ("change" in entry) {
						if (entry.j === jc) {
							newEntries.push({
								i: entry.i,
								di: 1,
								j: entry.j + shift,
								dj: 1,
								change: apply.combine(entry.change, entry1.change),
							});
							break;
						}
						continue;
					}

					if (entry.j < jc && jc < entry.j + entry.dj) {
						const replace = [...entry.replace];
						const off = jc - entry.j;
						replace[off] = apply.apply(replace[off]!, entry1.change);
						newEntries.push({
							i: entry.i,
							di: entry.di,
							j: entry.j + shift,
							dj: entry.dj,
							replace,
						});
					}
				}
				continue;
			}
			for (const _entry of this.entries) {
				throw new Error("TODO");
			}
			shift += entry1.dj - entry1.di;
		}
		// const j0 = index;
		// const j1 = index + toDelete;
		// for (const entry of this.entries) {
		// 	if ("change" in entry) {
		// 		continue;
		// 	}
		// 	if (entry.j < j0) {
		// 		const rb = entry.j + entry.dj;
		// 		if (j0 <= rb) {
		// 			// [      ]    entry
		// 			//   [  ]      splice
		// 			//
		// 			// [      ]    entry
		// 			//   [    ]    splice
		// 			newEntries.push({
		// 				...entry,
		// 				replace: entry.replace.toSpliced(j0 - entry.j, toDelete, ...toAdd),
		// 			});
		// 		} else {
		// 			// [      ]    entry
		// 			//   [    |  ] splice
		// 			const toDelete1 = entry.dj;
		// 			newEntries.push(
		// 				{
		// 					...entry,
		// 					replace: entry.replace.toSpliced(
		// 						j0 - entry.j,
		// 						toDelete1,
		// 						...toAdd.slice(0, toDelete1),
		// 					),
		// 				},
		// 				{
		// 					i: entry.i + entry.di,
		// 					di: 0,
		// 					j: j1,
		// 					dj: toAdd.length - toDelete1,
		// 					replace: toAdd.slice(toDelete1),
		// 				},
		// 			);
		// 		}
		// 	}
		// }
		return new SpliceTable(newEntries);
	}

	// endregion

	// region Update

	updateToApply(entryIndex: number, change: DT): SpliceTable<T, DT> {
		const entry = this.entries[entryIndex];
		if (!entry) {
			throw new Error("entryIndex out of bounds");
		}

		return this._replaceEntry(entryIndex, {
			i: entry.i,
			j: entry.j,
			di: 1,
			dj: 1,
			change,
		});
	}

	updateToSplice(
		entryIndex: number,
		newToDelete: number,
		newReplace: readonly T[],
	): SpliceTable<T, DT> {
		const entry = this.entries[entryIndex];
		if (!entry) {
			throw new Error("entryIndex out of bounds");
		}

		return this._replaceEntry(entryIndex, {
			i: entry.i,
			j: entry.j,
			di: newToDelete,
			dj: newReplace.length,
			replace: newReplace,
		});
	}

	private _replaceEntry(
		entryIndex: number,
		newEntry: SpliceTableEntry<T, DT>,
	): SpliceTable<T, DT> {
		const entry = this.entries[entryIndex]!;
		const iOff = newEntry.di - entry.di;
		const jOff = newEntry.dj - entry.dj;
		const newEntries = [...this.entries];
		newEntries[entryIndex] = newEntry;
		// Shift over the index mapping for rest of the table
		for (let k = entryIndex + 1; k < newEntries.length; k++) {
			const e = newEntries[k]!;
			const { i: i0, j: j0 } = e;
			newEntries[k] = { ...e, i: i0 + iOff, j: j0 + jOff };
		}
		return new SpliceTable(newEntries);
	}

	// endregion

	// region Factory

	static identity<T, DT>(): SpliceTable<T, DT> {
		return new SpliceTable([]);
	}

	static fromChange<T, DT>(i: number, change: DT): SpliceTable<T, DT> {
		return new SpliceTable([
			{
				i,
				di: 1,
				j: i,
				dj: 1,
				change,
			},
		]);
	}

	static fromSplice<T, DT>(
		i: number,
		toDelete: number,
		replace: readonly T[],
	): SpliceTable<T, DT> {
		if (toDelete === 0 && replace.length === 0) {
			return new SpliceTable([]);
		}

		return new SpliceTable([
			{
				i,
				di: toDelete,
				j: i,
				dj: replace.length,
				replace,
			},
		]);
	}

	/**
	 * Creates a new `SpliceTable` from an array of parallel splice operations.
	 * Requirements:
	 * - `entries` is sorted by `index` asending.
	 * - `entries` represents a list of non-overlapping intervals by `[index, index + offset)`
	 *   where the `offset` is 1 for "change" entries
	 */
	static fromParallelEntries<T, DT>(
		entries: ParSpliceEntries<T, DT>,
	): SpliceTable<T, DT> {
		const entries1: SpliceTableEntry<T, DT>[] = [];
		let offset = 0;
		let minIndex = 0;
		for (const entry of entries) {
			if (entry.index < minIndex) {
				throw new Error(
					`disallowed index (overlapping or out of bounds): ${entry.index}, must be >= ${minIndex}`,
				);
			}
			if ("change" in entry) {
				entries1.push({
					i: entry.index,
					di: 1,
					j: entry.index + offset,
					dj: 1,
					change: entry.change,
				});
				minIndex += 1;
				continue;
			}

			// Eliminate empty entries
			if (entry.lenToRemove === 0 && entry.replace.length === 0) {
				continue;
			}
			entries1.push({
				i: entry.index,
				di: entry.lenToRemove,
				j: entry.index + offset,
				dj: entry.replace.length,
				replace: entry.replace,
			});

			minIndex += entry.lenToRemove;
			offset += entry.replace.length - entry.lenToRemove;
		}
		return new SpliceTable(entries1);
	}

	// endregion
}

export function mapIndex<T, DT>(
	entries: ParSpliceEntries<T, DT>,
	index: number,
) {
	return SpliceTable.fromParallelEntries(entries).mapIndex(index);
}

export function unmapIndex<T, DT>(
	entries: ParSpliceEntries<T, DT>,
	index: number,
) {
	return SpliceTable.fromParallelEntries(entries).unmapIndex(index);
}

/**
 * Splits a single `SpliceEntry` at a particular mapped index (`j`).
 * Requirement: `entry.i < iSplit < entry.i + entry.di`
 */
function splitEntryAtIndex<T>(
	entry: SpliceEntry<T>,
	iSplit: number,
): readonly [SpliceEntry<T>, SpliceEntry<T>] {
	const res: SpliceEntry<T>[] = [];
	const len = iSplit - entry.i;
	const { i, di, j, dj, replace } = entry;
	if (len < entry.dj) {
		// i i+di
		// [ | ]
		// [ |     ]
		// j       j+dj
		return [
			{
				i: i,
				di: len,
				j: j,
				dj: len,
				replace: replace.slice(0, len),
			},
			// Insert new elements
			{
				i: i + di,
				di: 0,
				j: j + len,
				dj: dj - len,
				replace: replace.slice(len),
			},
		];
	}
	if (len === entry.dj) {
		res.push(
			{
				i,
				di: len,
				j,
				dj: len,
				replace: replace,
			},
			{
				i: i + len,
				di: di - len,
				j: j + len,
				dj: 0,
				replace: [],
			},
		);
	}
	// len >= entry.dj
	// Split at a removal
	// i        i+di
	// [    |   ]
	// [  ]
	// j     j+dj
	// i      i+di
	// [  |   ]
	// [  ]
	// j     j+dj
	return [
		{
			i,
			di: len,
			j,
			dj: len,
			replace: replace,
		},
		{
			i: i + len,
			di: di - len,
			j: j + len,
			dj: 0,
			replace: [],
		},
	];
}

/**
 * Given entries being combined, `entries` and `otherEntries`: Split
 * `otherEntries` based on the `[j, j+dj]` intervals of `entries` such that
 * each interval within the result do not completely encompass intervals within `entries`.
 *
 * Before:
 * ```
 * entries  [  ]       [   ]  [   ]        [   ]
 * other    [     ]      [           ]   [   ]
 * ```
 * After:
 * ```
 * entries  [  ]       [   ]  [   ]        [   ]
 * other    [  |  ]      [ |  |   |  ]   [ | ]
 * ```
 */
function splitOtherEntriesWith<T, DT>(
	entries: readonly SpliceTableEntry<T, DT>[],
	otherEntries: readonly SpliceTableEntry<T, DT>[],
): readonly SpliceTableEntry<T, DT>[] {
	const out: SpliceTableEntry<T, DT>[] = [];
	for (const otherEntry of otherEntries) {
		if ("change" in otherEntry) {
			out.push(otherEntry);
			continue;
		}
		const { i, di } = otherEntry;
		const toSplit: number[] = [];
		if (di <= 1) {
			for (const e of entries) {
				if (!withinInterval(e, i)) continue;
				toSplit.push(i);
			}
		} else {
			for (const e of entries) {
				if (withinInterval(e, i)) toSplit.push(i);
				if (withinInterval(e, i + di - 1)) toSplit.push(i);
			}
		}

		if (toSplit.length === 0) {
			out.push(otherEntry);
		} else if (toSplit.length === 1) {
			out.push(...splitEntryAtIndex(otherEntry, toSplit[0] as number));
		}

		let changed = true;
		let temp: SpliceEntry<T>[] = [otherEntry];
		while (changed) {
			changed = false;
			const temp1 = [] as typeof temp;
			for (const tempEntry of temp) {
				for (const iSplit of toSplit) {
					if (changed) {
						break;
					}
					if (withinInterval(tempEntry, iSplit)) {
						changed = true;
						temp1.push(...splitEntryAtIndex(tempEntry, iSplit));
						break;
					}
				}
				if (!changed) {
					temp1.push(tempEntry);
				}
			}
			temp = temp1;
		}
		out.push(...temp);
	}
	return out;
}

function withinInterval(
	entry: { j: number; dj: number },
	index: number,
): boolean {
	return entry.j < index && index < entry.j + entry.dj;
}
