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
export type SpliceTableEntryNoJ<T, DT> =
	| Omit<SpliceEntry<T>, "j">
	| Omit<ApplyEntry<DT>, "j">;

export type SpliceEntries<T, DT> = readonly SpliceTableEntry<T, DT>[];
export type SpliceEntriesMutable<T, DT> = SpliceTableEntry<T, DT>[];

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
	/** The mapped index. */
	readonly index: number;
	/** If `result` is not `Unchanged`, the entry performing the change. */
	readonly entry: SpliceTableEntry<T, DT> | null;
	/** How the index was mapped. */
	readonly result: MapResult;
	/** Index to the nearest entry. */
	readonly entryIndex: number;
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

	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.entries;
	}

	/** Gets the minimum array length required to apply this `SpliceTable`. */
	get requiredLength() {
		const kLast = this.entries.length - 1;
		if (kLast < 0) {
			return 0;
		}
		const { i, di } = this.entries[kLast]!;
		return i + di;
	}

	/**
	 * Gets the length difference between the output array and the input array.
	 *
	 *  `this.apply(array, ...).length - array.length`
	 */
	get lengthDifference() {
		if (this.entries.length === 0) {
			return 0;
		}
		const kLast = this.entries.length - 1;
		const { i, di, j, dj } = this.entries[kLast]!;
		return j + dj - (i + di);
	}

	get isEmpty() {
		return this.entries.length === 0;
	}

	get firstAffectedIndex(): number | null {
		if (this.entries.length === 0) {
			return null;
		}
		return this.entries[0]!.i;
	}

	// region Mapping

	/**
	 * Given the input array index, returns the corresponding output index and splice table entry.
	 */
	mapIndex(index: number): MapIndexResult<T, DT> {
		if (this.entries.length === 0) {
			return { index, entry: null, result: MapResult.Unchanged, entryIndex: 0 };
		}
		for (let k = 0; k < this.entries.length; k++) {
			const entry = this.entries[k]!;
			if (index < entry.i) {
				return {
					index,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: k,
				};
			}

			const nextEntry =
				k + 1 === this.entries.length ? null : this.entries[k + 1]!;
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
					entryIndex: k + 1,
				};
			}
			if (entry.dj === entry.di) {
				return {
					index: entry.j + (index - entry.i),
					entry,
					result: MapResult.Replaced,
					entryIndex: k,
				};
			}
			const n = entry.dj < entry.di ? entry.dj : entry.di;
			if (index < entry.i + n) {
				return {
					index: entry.j + (index - entry.i),
					entry,
					result: MapResult.Replaced,
					entryIndex: k,
				};
			}
			return {
				index: entry.j + entry.dj,
				entry,
				result: entry.dj < entry.di ? MapResult.Removed : MapResult.Added,
				entryIndex: k,
			};
		}

		const last = this.entries[this.entries.length - 1]!;
		return {
			index: index + (last.j + last.dj) - (last.i + last.di),
			entry: null,
			result: MapResult.Unchanged,
			entryIndex: this.entries.length,
		};
	}

	/** Gets the position at the input array given the output array index. */
	unmapIndex(index: number): MapIndexResult<T, DT> {
		if (this.entries.length === 0) {
			return { index, entry: null, result: MapResult.Unchanged, entryIndex: 0 };
		}
		for (let k = 0; k < this.entries.length; k++) {
			const entry = this.entries[k]!;
			const nextEntry =
				k + 1 === this.entries.length ? null : this.entries[k + 1]!;
			if (index < entry.j) {
				return {
					index,
					entry: null,
					result: MapResult.Unchanged,
					entryIndex: k,
				};
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
					entryIndex: k,
				};
			}
			if (entry.dj === entry.di) {
				return {
					index: entry.i + (index - entry.j),
					entry,
					result: MapResult.Replaced,
					entryIndex: k,
				};
			}
			const n = entry.dj < entry.di ? entry.dj : entry.di;
			if (index < entry.j + n) {
				return {
					index: entry.i + (index - entry.j),
					entry,
					result: MapResult.Replaced,
					entryIndex: k,
				};
			}
			return {
				index: entry.i + entry.di,
				entry,
				result: entry.dj < entry.di ? MapResult.Removed : MapResult.Added,
				entryIndex: k,
			};
		}

		const last = this.entries[this.entries.length - 1]!;
		return {
			index: index + (last.i + last.di) - (last.j + last.dj),
			entry: null,
			result: MapResult.Unchanged,
			entryIndex: this.entries.length,
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
		return this.combine(SpliceTable.fromChange(index, change), apply);
	}

	combine(other: SpliceTable<T, DT>, apply: Apply<T, DT>): SpliceTable<T, DT> {
		return combineTables(this, other, apply);
	}

	map<S, DS>({
		evaluate,
		forward,
	}: {
		evaluate: (i: number, input: T[]) => S;
		forward: (i: number, change: DT) => DS;
	}): SpliceTable<S, DS> {
		return new SpliceTable(
			this.entries.map((e) => {
				const { i } = e;
				if ("change" in e) {
					return { ...e, change: forward(i, e.change) };
				}
				return { ...e, replace: e.replace.map((x, i1) => evaluate(i + i1, x)) };
			}),
		);
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

	// region Array manipulation

	/**
	 * Add an offset to the `i` and `j` of the entries.
	 */
	addOffset(di: number, dj = 0): SpliceTable<T, DT> {
		if (this.entries.length > 0) {
			if (this.entries[0]!.i + di < 0) {
				console.error("negative index error", { entries: this.entries, di });
				// throw new Error("addOffset: cannot result in negative index for i");
			}
			// if (this.entries[0]!.j + di + dj < 0) {
			// 	console.error(this.entries[0], di + dj);
			// 	throw new Error("addOffset: cannot result in negative index for j");
			// }
		}

		return new SpliceTable(
			this.entries.map((x) => {
				const x1 = { ...x };
				x1.i += di;
				x1.j += di + dj;
				// if (x1.j < 0) {
				// 	x1.j = 0;
				// }
				return x1;
			}),
		);
	}

	// TODO still broken
	cut(iSplit: number): [SpliceTable<T, DT>, SpliceTable<T, DT>] {
		if (this.entries.length === 0) {
			return [SpliceTable.identity(), SpliceTable.identity()];
		}

		if (iSplit < this.entries[0]!.i) {
			return [SpliceTable.identity(), this.addOffset(-iSplit)];
		}

		const last = this.entries[this.entries.length - 1]!;
		if (iSplit >= last.i + last.di) {
			return [this, SpliceTable.identity()];
		}

		let k = 0;
		for (
			;
			k < this.entries.length &&
			iSplit >= this.entries[k]!.i + this.entries[k]!.di;
			k++
		) {}
		// Invariant: entries[0..k] have e.i + e.di < iSplit
		// Invariant: entries[k..] have e.i >= iSplit

		if (k >= this.entries.length) {
			return [this, SpliceTable.identity()];
		}

		const e = this.entries[k]!;
		const isInside = e.i <= iSplit && iSplit < e.i + e.di;
		if (!isInside) {
			const left = new SpliceTable<T, DT>(
				mergeAdjacents([...this.entries.slice(0, k)]),
			);
			const right0 = new SpliceTable<T, DT>(
				mergeAdjacents(this.entries.slice(k)),
			);
			const adj =
				right0.entries.length === 0
					? 0
					: right0.entries[0]!.i - right0.entries[0]!.j;
			// console.log("not inside");
			// console.log("cut", { es: this.entries, iSplit, k });
			// console.log({ left, right0 });
			const right = right0.addOffset(-iSplit, adj);
			return [left, right];
		}

		const [l, r] =
			"change" in e ? cutApplyEntry(e, iSplit) : cutSpliceEntry(e, iSplit);
		const left = new SpliceTable<T, DT>(
			mergeAdjacents([
				...this.entries.slice(0, k === 0 ? 0 : k - 1),
				...(l ? [l] : []),
			]),
		);
		const right0 = new SpliceTable<T, DT>(
			mergeAdjacents([...(r ? [r] : []), ...this.entries.slice(k + 1)]),
		);
		// console.log("inside");
		// console.log("cut", { es: this.entries, iSplit });
		// console.log({ left, right0 });
		const adj =
			right0.entries.length === 0
				? 0
				: right0.entries[0]!.i - right0.entries[0]!.j;
		return [left, right0.addOffset(-iSplit, adj)];
	}

	stitch(right: SpliceTable<T, DT>, iStart: number) {
		if (this.entries.length === 0) {
			return right.addOffset(iStart);
		}
		if (right.entries.length > 0 && iStart < this.requiredLength) {
			console.error(
				"overlap",
				this.entries,
				right.entries,
				iStart,
				this.requiredLength,
			);
			throw new Error("uncut: cannot create overlap");
		}
		if (right.entries.length === 0) {
			return this;
		}

		// console.log({
		// 	di: iStart,
		// 	dj: iStart + this.lengthDifference,
		// 	right: right.addOffset(iStart, this.lengthDifference).entries,
		// });
		return new SpliceTable<T, DT>(
			mergeAdjacents([
				...this.entries,
				...right.addOffset(iStart, this.lengthDifference).entries,
			]),
		);
	}

	slice(i: number, iEnd: number): SpliceTable<T, DT> {
		const [_, tr] = this.cut(i);
		return tr.cut(iEnd - i)[0];
	}

	splice(
		i: number,
		toDelete: number,
		replace: T[],
		apply: Apply<T, DT>,
	): SpliceTable<T, DT> {
		return this.combine(SpliceTable.fromSplice(i, toDelete, replace), apply);
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

	static fromPush<T, DT>(
		length: number,
		toPush: readonly T[],
	): SpliceTable<T, DT> {
		if (toPush.length === 0) {
			return new SpliceTable([]);
		}

		return new SpliceTable([
			{
				i: length,
				di: 0,
				j: length,
				dj: toPush.length,
				replace: toPush,
			},
		]);
	}

	static fromUnshift<T, DT>(toUnshift: readonly T[]): SpliceTable<T, DT> {
		if (toUnshift.length === 0) {
			return new SpliceTable([]);
		}

		return new SpliceTable([
			{
				i: 0,
				di: 0,
				j: 0,
				dj: toUnshift.length,
				replace: toUnshift,
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

export function combineTables<T, DT>(
	leftTable: SpliceTable<T, DT>,
	rightTable: SpliceTable<T, DT>,
	apply: Apply<T, DT>,
	shouldMergeAdjacents = true,
): SpliceTable<T, DT> {
	function getDjiAdjustment(e: { di: number; dj: number; change?: DT }) {
		return "change" in e ? 0 : e.dj - e.di;
	}

	function reoffsetLeft(
		entry: SpliceTableEntry<T, DT>,
		dji: number,
	): SpliceTableEntry<T, DT> {
		const { i, di } = entry;
		return "replace" in entry
			? ({
					i,
					di,
					j: i + dji,
					dj: entry.dj,
					replace: entry.replace,
				} satisfies SpliceEntry<T>)
			: ({
					i,
					di: entry.di,
					j: i + dji,
					dj: entry.dj,
					change: entry.change,
				} satisfies ApplyEntry<DT>);
	}

	/** Flattens and makes dir adjustment `[i, j] = [i + dir, i + dir + dji]` */
	function reoffsetRight(
		rhs: SpliceTableEntry<T, DT> | SpliceTableEntryNoJ<T, DT>,
		dir: number,
	): SpliceTableEntryNoJ<T, DT> {
		const e1 = { ...rhs };
		e1.i += dir;
		// @ts-expect-error Intentional
		e1.j = Number.NaN;
		return e1;
	}

	function reoffsetRightToLeft(
		entry: SpliceTableEntryNoJ<T, DT>,
		dji: number,
		_dir: number,
	): SpliceTableEntry<T, DT> {
		const i0 = entry.i - dji;
		const { i, di, dj } = entry;
		return "replace" in entry
			? ({
					i: i0,
					di,
					j: i,
					dj,
					replace: (entry as SpliceEntry<T>).replace,
				} satisfies SpliceEntry<T>)
			: ({
					i: i0,
					di: di as 1,
					j: i,
					dj: dj as 1,
					change: (entry as ApplyEntry<DT>).change,
				} satisfies ApplyEntry<DT>);
	}

	// mutated due to splitting
	const right: SpliceTableEntryNoJ<T, DT>[] = rightTable.entries.map((e) => {
		const e1 = { ...e };
		e1.j = Number.NaN;
		return e1;
	});
	const left: SpliceEntriesMutable<T, DT> = [...leftTable.entries];
	const res: SpliceEntriesMutable<T, DT> = [];
	let l = 0;
	let r = 0;
	// (j - i) from left to right
	let dji = 0;
	// rhs.i displacement due to lhs mutating
	let dir = 0;
	while (l < left.length && r < right.length) {
		const lhs = reoffsetLeft(left[l]!, dji);
		const rhs = reoffsetRight(right[r]!, dir);
		const { j: xs } = lhs;
		const xe = xs + lhs.dj;
		const { i: ys } = rhs;
		const ye = ys + rhs.di;

		// [lhs )
		//      [rhs )
		// after
		if (xe <= ys) {
			res.push(lhs);
			dji += getDjiAdjustment(lhs);
			l++;
			continue;
		}

		//      [lhs )
		// [rhs )
		// before
		if (ye <= xs) {
			// before-all case
			res.push(reoffsetRightToLeft(rhs, dji, dir));
			dji += getDjiAdjustment(rhs);
			// must be done
			dir += getDjiAdjustment(rhs);
			r++;
			continue;
		}

		// [lhs       ...
		//    [rhs    ...
		if (xs <= ys) {
			if (ye <= xe) {
				// [lhs       )
				//    [rhs )
				// left-inside
				const off = rhs.i - lhs.j;
				const [lhsNew, ddir] = applyInside(lhs, rhs, apply, off);
				left[l] = lhsNew;
				// Due to left entry being mutated, there's an extra adjustment
				dir += ddir;
				r++;
				continue;
			}

			// [lhs      )
			//    [rhs        )
			// left-overlap

			// need to split:
			// [lhs      )
			//    [rhs   |    )
			const iSplit = lhs.j + lhs.dj;
			if ("change" in rhs) {
				throw new Error("not possible: 'change' in rhs");
			}
			const [r1, r2] = splitEntryRight(rhs, iSplit);
			if (r2 === null) {
				throw new Error("can't split");
			}

			right.splice(r, 1, reoffsetRight(r1, -dir), reoffsetRight(r2, -dir));
			continue;
		}

		//       [lhs    )
		//  [rhs |     )
		if ("change" in rhs) {
			throw new Error("right-overlap: not possible");
		}
		const [r1, r2] = splitEntryRight(rhs, lhs.j);
		if (r2 === null) {
			throw new Error("right-overlap: can't split");
		}

		right.splice(r, 1, reoffsetRight(r1, -dir), reoffsetRight(r2, -dir));
	}

	for (; l < left.length; l++) {
		const lhs = reoffsetLeft(left[l]!, dji);
		res.push(lhs);
		dji += getDjiAdjustment(lhs);
	}
	for (; r < right.length; r++) {
		const rhs = reoffsetRight(right[r]!, dir);
		res.push(reoffsetRightToLeft(rhs, dji, dir));
		dji += getDjiAdjustment(rhs);
		dir += getDjiAdjustment(rhs);
	}

	return new SpliceTable(shouldMergeAdjacents ? mergeAdjacents(res) : res);
}

export function mergeAdjacents<T, DT>(
	res: SpliceEntries<T, DT>,
): SpliceEntries<T, DT> {
	// Merge adjacent entries
	const afterMerging: SpliceEntriesMutable<T, DT> = [];
	for (let k = 0; k < res.length; k++) {
		const entry = res[k]!;
		if (k + 1 === res.length || "change" in entry) {
			if (!(entry.di === 0 && entry.dj === 0)) {
				afterMerging.push(entry);
			}
			continue;
		}

		let cdi = entry.di;
		let cdj = entry.dj;
		const cReplace = [...entry.replace];
		for (let k1 = k + 1; k1 < res.length; k1++) {
			const next = res[k1]!;
			const i1 = entry.i + cdi;
			const j1 = entry.j + cdj;
			if ("change" in next || i1 !== next.i || j1 !== next.j) {
				continue;
			}
			cdi += next.di;
			cdj += next.dj;
			cReplace.push(...next.replace);
			// move k forward
			k++;
		}

		if (cdi === 0 && cdj === 0) {
			continue;
		}
		afterMerging.push({
			i: entry.i,
			di: cdi,
			j: entry.j,
			dj: cdj,
			replace: cReplace,
		});
	}
	return afterMerging;
}

/** Requires: `entry.j <= jSplit && jSplit < entry.j + entry.dj` */
export function splitEntryLeft<T>(
	entry: SpliceEntry<T>,
	jSplit: number,
): readonly [SpliceEntry<T>, SpliceEntry<T> | null] {
	const len = jSplit - entry.j;
	if (len >= entry.dj || len < 0) {
		throw new Error("can't split");
	}
	const { i, di, j, dj, replace } = entry;
	// i   i+di
	// [ | ]
	// [ |     ]
	// j       j+dj
	//
	// i  i+di
	// [  ]
	// [     |  ]
	// j        j+dj
	const first: SpliceEntry<T> = {
		i,
		di: di < len ? di : len,
		j,
		dj: len,
		replace: replace.slice(0, len),
	};
	if (len === di && len === dj) {
		// second would be empty: [i, i), [j, j)
		return [first, null];
	}
	const second = {
		i: i + first.di,
		di: di - first.di,
		j: j + first.dj,
		dj: dj - first.dj,
		replace: replace.slice(len),
	};
	return [first, second];
}

/** Requires: `entry.i <= iSplit && iSplit < entry.i + entry.di` */
function splitEntryRight<T>(
	entry: Omit<SpliceEntry<T>, "j">,
	iSplit: number,
): readonly [Omit<SpliceEntry<T>, "j">, Omit<SpliceEntry<T>, "j"> | null] {
	const len = iSplit - entry.i;
	if (len >= entry.di || len < 0) {
		throw new Error("can't split");
	}
	const { i, di, dj, replace } = entry;
	// i   i+di
	// [ | ]
	// [ |     ]
	// j       j+dj
	//
	// i      i+di
	// [   |  ]
	// [ ]
	// j        j+dj
	const first: Omit<SpliceEntry<T>, "j"> = {
		i,
		di: len,
		dj: dj < len ? dj : len,
		replace: len > replace.length ? replace : replace.slice(0, len),
	};
	if (len === di && len === dj) {
		// second would be empty: [i, i), [j, j)
		return [first, null];
	}
	const second = {
		i: i + first.di,
		di: di - first.di,
		dj: dj < len ? 0 : dj - len,
		replace: len > replace.length ? [] : replace.slice(len),
	};
	return [first, second];
}

export function cutApplyEntry<DT>(
	entry: ApplyEntry<DT>,
	iSplit: number,
): readonly [ApplyEntry<DT> | null, ApplyEntry<DT> | null] {
	const len = iSplit - entry.i;
	if (len >= entry.di || len < 0) {
		throw new Error("can't split");
	}

	return len === 0 ? [null, entry] : [entry, null];
}

/**
 * Requires:
 *  - Insert entry: `iSplit === entry.i`
 *  - Others: `entry.i <= iSplit && iSplit < entry.i + entry.di`
 * Invariants:
 *  - `j - i` for the split entries are preserved.
 */
export function cutSpliceEntry<T>(
	entry: SpliceEntry<T>,
	iSplit: number,
): readonly [SpliceEntry<T> | null, SpliceEntry<T> | null] {
	if (entry.di === 0) {
		if (iSplit !== entry.i) {
			throw new Error("can only cut insert entries at exact index i");
		}
		return [null, entry];
	}
	const len = iSplit - entry.i;
	if (len >= entry.di || len < 0) {
		throw new Error("can't split");
	}
	const { i, di, j, dj, replace } = entry;
	const first: SpliceEntry<T> = {
		i,
		di: len,
		j: j,
		dj: dj < len ? dj : len,
		replace: len > replace.length ? replace : replace.slice(0, len),
	};
	if (len === di && len === dj) {
		// second would be empty: [i, i), [j, j)
		return [first, null];
	}
	const second = {
		i: i + first.di,
		di: di - first.di,
		j: j + first.di, // to preserve (j - i)
		dj: dj < len ? 0 : dj - len,
		replace: len > replace.length ? [] : replace.slice(len),
	};
	return [first, second];
}

/** Combine the changes from `lhs` with `rhs` */
export function applyInside<T, DT>(
	lhs: SpliceTableEntry<T, DT>,
	rhs: Omit<SpliceEntry<T>, "i" | "j"> | Omit<ApplyEntry<DT>, "i" | "j">,
	apply: Apply<T, DT>,
	off: number,
): [SpliceTableEntry<T, DT>, number] {
	if ("change" in lhs) {
		if (off !== 0) {
			throw new Error(
				"applyInside: if lhs is a change, off === 0 must be true",
			);
		}

		if ("change" in rhs) {
			return [{ ...lhs, change: apply.combine(lhs.change, rhs.change) }, 0];
		}
		if (rhs.di !== 1) {
			throw new Error("applyInside: if lhs is a change, rhs must have di of 1");
		}
		return applyInside(
			{
				i: lhs.i,
				di: lhs.di,
				j: lhs.j,
				dj: lhs.dj,
				// Placeholder value, will be overwritten
				replace: [null as never as T],
			},
			rhs,
			apply,
			0,
		);
	}

	const replace1 = [...lhs.replace];
	if ("change" in rhs) {
		replace1[off] = apply.apply(replace1[off]!, rhs.change);
		return [{ ...lhs, replace: replace1 }, 0];
	}
	replace1.splice(off, rhs.di, ...rhs.replace);
	return [
		{ ...lhs, dj: replace1.length, replace: replace1 },
		replace1.length - lhs.replace.length,
	];
}
