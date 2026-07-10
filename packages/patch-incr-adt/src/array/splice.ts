// biome-ignore-all lint/style/noNonNullAssertion: for checked array access
import type { Apply, DRO } from "@/types/algebra";

/**
 * An entry in the splice operation.
 */
export interface SpliceEntry<T> {
	/** The start index of the splice operation. */
	readonly index: number;
	/** The number of elements to remove. */
	readonly lenToRemove: number;
	/** The elements to replace. */
	readonly replace: T[];
}

export interface ApplyEntry<DT> {
	readonly index: number;
	readonly change: DT;
}

export type SpliceTableEntry<T, DT> = SpliceEntry<T> | ApplyEntry<DT>;

export type SpliceEntries<T, DT> = SpliceTableEntry<T, DT>[];

/**
 * The change-type for an array. Consists of a list of concurrent splices or internal changes.
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
	constructor(
		readonly entries: Readonly<SpliceEntries<T, DT>>,
		readonly offsets: Readonly<number[]>,
	) {}

	toBuilder(): SpliceTableBuilder<T, DT> {
		return new SpliceTableBuilder([...this.entries], [...this.offsets]);
	}
}

/*
 * Index variable naming conventions:
 *  - `i`: index of the source array (pre-splice)
 *  - `j`: index of the destination array (post-splice)
 *  - `k`: index of the splice table entry
 */

/** Builder for a `SpliceTable`. Is internally mutable but each `SpliceTableEntry` remains immutable. */
export class SpliceTableBuilder<T, DT> {
	private offsets: number[];
	constructor(
		/**
		 * The splice/apply entries, sorted by `iStart`.
		 * The intervals `[iStart, iStart + dLen)` for each element do not overlap where `dLen`
		 * is `lenToRemove` for `SpliceEntry` and `1` for `ApplyEntry`.
		 */
		readonly entries: SpliceEntries<T, DT> = [],
		/**
		 * For `this.entries[iEntry]`, `this.offsets[iEntry]` is the index of
		 * the output-array at that entry.
		 */
		offsets = computeOffsets([], this.entries),
	) {
		this.offsets = offsets;
	}

	build(): SpliceTable<T, DT> {
		return new SpliceTable(this.entries, this.offsets);
	}

	private recomputeOffsets() {
		this.offsets = computeOffsets([], this.entries);
	}

	private cleanUpEntries() {
		let changed = true;
		while (changed) {
			changed = false;
			// Delete empty entries
			for (let k = this.entries.length - 1; k >= 0; k--) {
				const e = this.entries[k]!;
				if (!("replace" in e)) {
					continue;
				}
				if (e.replace.length === 0 && e.lenToRemove === 0) {
					changed = true;
					this.entries.splice(k, 1);
					break;
				}
			}

			// Merge adjacent entries
			for (let k = this.entries.length - 2; k >= 0; k--) {
				const e = this.entries[k]!;
				const e1 = this.entries[k + 1]!;
				if (!("replace" in e && "replace" in e1)) {
					continue;
				}
				if (e1.index === e.index + e.lenToRemove) {
					this.entries.splice(k, 1, {
						index: e.index,
						lenToRemove: e.lenToRemove + e1.lenToRemove,
						replace: [...e.replace, ...e1.replace],
					});
				}
				if (e.replace.length === 0 && e.lenToRemove === 0) {
					changed = true;
					this.entries.splice(k, 1);
					break;
				}
			}
		}
	}

	applyAtI(
		i: number,
		change: DT,
		{ apply, combine }: Pick<Apply<T, DT>, "apply" | "combine">,
	): this {
		const k = findK(this.entries, i);
		if (k === -2) {
			this.entries.unshift({ index: i, change });
		} else if (k === -1) {
			this.entries.push({ index: i, change });
		} else {
			const e = this.entries[k]!;
			if ("change" in e) {
				this.entries[k] = { index: i, change: combine(e.change, change) };
			} else {
				if (i < e.index + e.replace.length) {
					const replace1 = [...e.replace];
					const di = i - e.index;
					replace1[di] = apply(replace1[di]!, change);
					this.entries[k] = {
						index: e.index,
						lenToRemove: e.lenToRemove,
						replace: replace1,
					};
				} else {
					this.entries.splice(k + 1, 0, { index: i, change });
				}
			}
		}
		this.cleanUpEntries();
		this.recomputeOffsets();
		return this;
	}

	spliceI(_iIn: number, _lenIn: number, _replacement = [] as T[]): this {
		// const k = findOverlap(this.entries, iIn);
		throw new Error("TODO implement");
	}

	/** The minimum length of the source array for the splice operations to be applicable. */
	minLength() {
		if (this.entries.length === 0) return 0;
		const last = this.entries[this.entries.length - 1] as SpliceEntry<T>;
		return last.index + last.replace.length;
	}

	/** Gets the splice table entry at a particular index. */
	lookupEntry(i: number): SpliceEntry<T> | ApplyEntry<DT> | null {
		const k = findK(this.entries, i);
		if (k < 0) {
			return null;
		}
		return this.entries[k]!;
	}

	/**
	 * Given an input to the input array,
	 * return the remapped index and the change applied:
	 * - Apply internal chang
	 * - Replaced (by splice)
	 * - Unchanged
	 */
	lookupIndex(_i: number): { index: number; change: DRO<T> | ApplyEntry<DT> } {
		throw new Error("TODO implement");
	}
}

function _toSequentialForm<T, DT>(
	entries: SpliceEntries<T, DT>,
): SpliceEntries<T, DT> {
	let di = 0;
	const entries1 = [] as SpliceEntries<T, DT>;
	for (const e of entries) {
		entries.push(
			"replace" in e
				? { ...e, index: e.index + di }
				: { ...e, index: e.index + di },
		);
		if ("replace" in e) {
			di += e.replace.length - e.lenToRemove;
		}
	}
	return entries1;
}

/**
 * Find the largest $k$ that that `entries[k].index <= i`.
 * @returns -2 if `i` is before all entries, -1 if `i` is after all entries, otherwise, the index to the entry
 */
function findK<T, DT>(entries: SpliceEntries<T, DT>, i: number): number {
	if (entries.length === 0 || i < entries[0]!.index) {
		return -2;
	}
	for (let k = 0; k < entries.length; k++) {
		const e = entries[k]!;
		if (e.index <= i) {
			return k;
		}
	}
	return -1;
}

function computeOffsets<T, DT>(
	outOffsets: number[],
	entries: SpliceEntries<T, DT>,
	iEntryStart = 0,
): number[] {
	let i = 0;
	for (let k = iEntryStart; k < entries.length; k++) {
		const e = entries[k]!;
		outOffsets.push(i);
		i = i + ("replace" in e ? e.replace.length - e.lenToRemove : 1);
	}

	return outOffsets;
}
