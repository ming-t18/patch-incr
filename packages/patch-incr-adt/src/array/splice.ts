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
		return new SpliceTable(combineTables(this.entries, other.entries, apply));
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

export function combineTables1<T, DT>(
	unmapper: SpliceTable<T, DT>,
	rightTable: SpliceTable<T, DT>,
	apply: Apply<T, DT>,
): SpliceTable<T, DT> {
	function getDjiAdjustment(e: Pick<SpliceTableEntry<T, DT>, "di" | "dj">) {
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

	function makeDirAdjustment(rhs: SpliceTableEntry<T, DT>, dir: number) {
		const e1 = { ...rhs };
		e1.i += dir;
		return e1;
	}

	function reoffsetRight(
		entry: SpliceTableEntry<T, DT>,
		dji: number,
	): SpliceTableEntry<T, DT> {
		const i0 = entry.i - dji;
		return "replace" in entry
			? ({
					i: i0,
					di: entry.di,
					j: i0 + dji,
					dj: entry.dj,
					replace: entry.replace,
				} satisfies SpliceEntry<T>)
			: ({
					i: i0,
					di: entry.di,
					j: i0 + dji,
					dj: entry.dj,
					change: entry.change,
				} satisfies ApplyEntry<DT>);
	}

	// mutated due to splitting
	const right: SpliceEntriesMutable<T, DT> = [...rightTable.entries];
	const left: SpliceEntriesMutable<T, DT> = [...unmapper.entries];
	const res: SpliceEntriesMutable<T, DT> = [];
	let l = 0;
	let r = 0;
	// (j - i) from left to right
	let dji = 0;
	// rhs.i displacement due to lhs mutating
	let dir = 0;
	while (l < left.length && r < right.length) {
		const lhs = left[l]!;
		const rhs = makeDirAdjustment(right[r]!, dir);
		const { j: xs } = lhs;
		const xe = xs + lhs.dj;
		const { i: ys } = rhs;
		const ye = ys + rhs.di;

		// [lhs )
		//      [rhs )
		// after
		if (xe <= ys) {
			//console.log("after", l, r, "dji =", dji, "dir = ", dir);
			res.push(reoffsetLeft(lhs!, dji));
			dji += getDjiAdjustment(res[res.length - 1]!);
			//console.log(" dji -->", dji);
			l++;
			continue;
		}

		//      [lhs )
		// [rhs )
		// before
		if (ye <= xs) {
			//console.log("before", l, r, "dji =", dji, "dir = ", dir);
			// before-all case
			res.push(reoffsetRight(rhs, dji));
			dji += getDjiAdjustment(res[res.length - 1]!);
			//console.log(" dji --> ", dji);
			r++;
			continue;
		}

		// [lhs       ...
		//    [rhs    ...
		if (xs <= ys) {
			if (ye <= xe) {
				//console.log("left-inside", l, r, "dji =", dji, "dir = ", dir);
				// [lhs       )
				//    [rhs )
				// left-inside
				const off = rhs.i - lhs.j;
				const [lhsNew, ddir] = applyInside(lhs, rhs, apply, off);
				left[l] = lhsNew;
				// console.log("after applying inside", {
				// 	before: lhs,
				// 	rhs: rhs,
				// 	off,
				// 	after: lhsNew,
				// });
				res.push(lhsNew);
				// Due to left entry being mutated, there's an extra adjustment
				dji += getDjiAdjustment(lhsNew);
				dir += ddir;
				// console.log("  dji --> ", dji, ", dir --> ", dir);
				l++;
				r++;
				continue;
			}
			// console.log("left-overlap", l, r, "dji =", dji, "dir = ", dir);
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
			// console.log({ iSplit, rhs, split: [r1, r2] });
			right.splice(r, 1, r1, r2);
			continue;

			// continue;
		}

		// xs > ys

		//     [lhs    )
		//  [rhs   ...
		//  [rhs   ...
		throw new Error("TODO");
	}

	for (; l < left.length; l++) {
		// console.log("add-left", l, "dji =", dji);
		const e = left[l]!;
		res.push(reoffsetLeft(e, dji));
		dji += getDjiAdjustment(res[res.length - 1]!);
		// console.log("  dji --> ", dji);
	}
	for (; r < right.length; r++) {
		// console.log("add-right", r, "dji =", dji, ", dir = ", dir);
		const e = makeDirAdjustment(right[r]!, dir);
		// console.log("got:", {
		// 	before: right[r], afterAdj: e, afterReoffset: reoffsetRight(e, dji),
		// });
		res.push(reoffsetRight(e, dji));
		dji += getDjiAdjustment(res[res.length - 1]!);
		dir += getDjiAdjustment(right[r]!);
		// console.log("right", e, res[res.length - 1]!);
		// console.log("  dji --> ", dji, ", dir --> ", dir);
	}

	return new SpliceTable(res);
	// return postprocess(res);
}

function combineTables<T, DT>(
	left: SpliceEntries<T, DT>,
	right: SpliceEntries<T, DT>,
	apply: Apply<T, DT>,
): SpliceEntries<T, DT> {
	if (left.length === 0) {
		return right;
	}
	if (right.length === 0) {
		return left;
	}

	const unmapper = new SpliceTable(left);
	const res: SpliceEntriesMutable<T, DT> = [...left];
	const [beforePart, overlapPart, afterPart] = decomposeBeforeAfter(
		left,
		right,
	);

	while (overlapPart.length > 0) {
		const before = overlapPart.length;
		for (let kOverlap = overlapPart.length - 1; kOverlap >= 0; kOverlap--) {
			const rhs = overlapPart.pop()!;
			if ("change" in rhs) {
				const change = rhs.change;
				for (let k = 0; k < res.length; k++) {
					const entry = res[k]!;
					const off = rhs.i - entry.j;
					if (0 <= off && off < entry.dj) {
						if ("replace" in entry) {
							const replace1 = [...entry.replace];
							replace1[off] = apply.apply(replace1[off]!, change);
							res[k] = {
								...entry,
								replace: replace1,
							};
						} else {
							res[k] = {
								...entry,
								change: apply.combine(entry.change, change),
							};
						}
						break;
					}
				}
				continue;
			}

			const [kMin, kMax] = findOverlaps(res, rhs);
			if (kMax < kMin) {
				throw new Error("kMax < kMin");
			}

			const head = res[kMin]!;
			let tail = res[kMax]!;
			let pre: SpliceTableEntry<T, DT> | undefined | null;
			let post: SpliceTableEntry<T, DT> | undefined | null;

			if (head.j <= rhs.i && rhs.i < head.j + head.dj && "replace" in head) {
				const [pre1, mid1] = splitEntryLeft(head, rhs.i);
				pre = pre1;
				if (kMax === kMin && mid1 !== null) {
					tail = mid1;
				}
			}
			const i3 = rhs.i + rhs.di;
			if (
				tail !== null &&
				tail.j <= i3 &&
				i3 < tail.j + tail.dj &&
				"replace" in tail
			) {
				const [_, post1] = splitEntryLeft(tail, i3);
				post = post1;
			}

			const i1 = unmapper.unmapIndex(rhs.i).index;
			const i2 = unmapper.unmapIndex(rhs.i + rhs.di).index;
			const overwrite = {
				i: i1, // rhs.i + (newDisp - origDisp),
				di: i2 - i1,
				j: rhs.j,
				dj: rhs.dj,
				replace: rhs.replace,
			};
			res.splice(
				kMin,
				kMax + 1 - kMin,
				...(pre ? [pre] : []),
				overwrite,
				...(post ? [post] : []),
			);
		}

		const after = overlapPart.length;
		if (after >= before) {
			throw new Error("diverging");
		}
	}

	// Add back before and after parts
	res.unshift(...beforePart);
	res.push(...afterPart);

	return postprocess(res);
}

function postprocess<T, DT>(res: SpliceEntries<T, DT>): SpliceEntries<T, DT> {
	// Recompute j/dj
	let cdj = 0;
	const afterReindexingJ: SpliceEntriesMutable<T, DT> = [];
	for (let i = 0; i < res.length; i++) {
		const entry = res[i]!;
		const djOrig = entry.dj;
		const j = i === 0 ? entry.i : entry.j + cdj;
		afterReindexingJ.push(
			"replace" in entry
				? {
						i: entry.i,
						di: entry.di,
						j,
						dj: entry.replace.length,
						replace: entry.replace,
					}
				: {
						i: entry.i,
						di: entry.di,
						j,
						dj: 1,
						change: entry.change,
					},
		);
		if ("replace" in entry) {
			cdj += entry.replace.length - djOrig;
		}
	}

	// Merge adjacent entries
	const afterMerging = [] as typeof afterReindexingJ;
	for (let k = 0; k < afterReindexingJ.length; k++) {
		const entry = afterReindexingJ[k]!;
		// TODO eliminate empty entries
		if (entry.di === 0 && entry.dj === 0) {
			// console.error("empty found", k, afterReindexingJ);
			// throw new Error("invariant fail: empty entry found");
			continue;
		}
		if (k + 1 === afterReindexingJ.length || "change" in entry) {
			afterMerging.push(entry);
			continue;
		}

		let cdi = entry.di;
		let cdj = entry.dj;
		const cReplace = [...entry.replace];
		for (let k1 = k + 1; k1 < afterReindexingJ.length; k1++) {
			const next = afterReindexingJ[k + 1]!;
			const i1 = entry.i + entry.di;
			// if (next.i < i1) {
			// 	console.error("args", [left, right]);
			// 	console.error("all entries", afterReindexingJ);
			// 	console.error("overlap/order fail", k1, entry, next);
			// 	throw new Error("invariant fail: overlap or ordering violation");
			// }

			if ("change" in next || i1 !== next.i) {
				continue;
			}
			cdi += next.di;
			cdj += next.dj;
			cReplace.push(...next.replace);
			// move k forward
			k++;
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

export function decomposeBeforeAfter<T, DT>(
	left: SpliceEntries<T, DT>,
	right: SpliceEntries<T, DT>,
): [SpliceEntries<T, DT>, SpliceEntriesMutable<T, DT>, SpliceEntries<T, DT>] {
	if (left.length === 0) {
		return [[], [], []];
	}
	const first = left[0]!;
	const beforeAll: SpliceEntriesMutable<T, DT> = [];
	const afterAll: SpliceEntriesMutable<T, DT> = [];
	for (let k = 0; k < right.length; k++) {
		const entry = right[k]!;
		// is before first
		//  first      [  )
		//  entry   [  )
		if (entry.i + entry.di <= first.j) {
			// no need to remap
			beforeAll.push(entry);
			continue;
		}
		break;
	}
	const sliceStart = beforeAll.length;

	const unmapper = new SpliceTable(left);
	const last = left[left.length - 1]!;
	let sliceEnd = right.length;
	for (let k = right.length - 1; k >= 0; k--) {
		const entry = right[k]!;
		// is after last
		//  last    [  )
		//  entry      [  )
		if (entry.i >= last.j + last.dj) {
			const i1 = unmapper.unmapIndex(entry.i).index;
			sliceEnd--;
			afterAll.push(
				"replace" in entry
					? {
							i: i1,
							di: entry.di,
							j: entry.i,
							dj: entry.replace.length,
							replace: entry.replace,
						}
					: ({
							i: i1,
							di: 1,
							j: entry.i,
							dj: 1,
							change: entry.change,
						} satisfies ApplyEntry<DT>),
			);
			continue;
		}
		break;
	}
	afterAll.reverse();
	return [beforeAll, right.slice(sliceStart, sliceEnd), afterAll];
}

/** Requires: `entry.j <= jSplit && jSplit < entry.j + entry.dj` */
function splitEntryLeft<T>(
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
	entry: SpliceEntry<T>,
	iSplit: number,
): readonly [SpliceEntry<T>, SpliceEntry<T> | null] {
	const len = iSplit - entry.i;
	if (len >= entry.di || len < 0) {
		throw new Error("can't split");
	}
	const { i, di, j, dj, replace } = entry;
	// i   i+di
	// [ | ]
	// [ |     ]
	// j       j+dj
	//
	// i      i+di
	// [   |  ]
	// [ ]
	// j        j+dj
	const first: SpliceEntry<T> = {
		i,
		di: len,
		j,
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
		j: dj < len ? j + dj : j + len,
		dj: dj < len ? 0 : dj - len,
		replace: len > replace.length ? [] : replace.slice(len),
	};
	return [first, second];
}

export function withinInterval(
	entry: Readonly<{ j: number; dj: number }>,
	jIndex: number,
): boolean {
	return entry.j < jIndex && jIndex < entry.j + entry.dj;
}

function overlaps(
	lhs: Readonly<{ j: number; dj: number }>,
	rhs: Readonly<{ i: number; di: number }>,
): boolean {
	const x1 = lhs.j;
	const y1 = rhs.i;
	const y2 = rhs.i + rhs.di - 1;
	if (lhs.dj === 0) {
		if (rhs.di === 0) {
			return lhs.j === rhs.i;
		}
		return y1 <= x1 && x1 <= y2;
	}
	const x2 = lhs.j + lhs.dj - 1;
	return x2 >= y1 && x1 <= y2;
}

function findOverlaps(
	lhss: readonly Readonly<{ j: number; dj: number }>[],
	rhs: Readonly<{ i: number; di: number }>,
): [number, number] {
	let kMin = 0;
	let kMax = 0;
	for (let k = 0; k < lhss.length; k++) {
		const lhs = lhss[k]!;
		if (overlaps(lhs, rhs)) {
			kMin = k;
			break;
		}
	}

	for (let k = lhss.length - 1; k >= 0; k--) {
		const lhs = lhss[k]!;
		if (overlaps(lhs, rhs)) {
			kMax = k;
			break;
		}
	}
	return [kMin, kMax];
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
		return [{ ...lhs, replace: replace1 }, lhs.di - lhs.dj];
	}
	replace1.splice(off, rhs.di, ...rhs.replace);
	return [
		{ ...lhs, dj: replace1.length, replace: replace1 },
		replace1.length - lhs.replace.length,
	];
}
