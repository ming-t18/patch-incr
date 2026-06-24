import { getReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import {
	type Atomic$,
	BaseApplyClass,
	type DRO,
	type ReplaceOnly,
} from "@/types/algebra";

export class AAtomic<T>
	extends BaseApplyClass<T, DRO<T>, null>
	implements Atomic$<T>
{
	declare "~apply": { readonly value: T; readonly change: DRO<T> };
	readonly $type = "atomic" as const;
	constructor() {
		super(null);
	}
	fromReplace(x: T) {
		return makeReplaceOnly(x);
	}
	apply(value: T, change: DRO<T>): T {
		return change === null ? value : getReplaceOnly(change);
	}
	override canApply(_value: T, _change: DRO<T>): boolean {
		return true;
	}
	isReplace(change: DRO<T>): ReplaceOnly<T> | null {
		return change;
	}
	combine(a: DRO<T>, b: DRO<T>): DRO<T> {
		return b === null ? a : b;
	}
	isEmpty(change: DRO<T>): boolean {
		return change === null;
	}

	// biome-ignore lint/suspicious/noExplicitAny: intentional
	static INSTANCE = new AAtomic<any>();
}

export const atomic = <T>(newInstance = false): AAtomic<T> =>
	newInstance ? new AAtomic<T>() : (AAtomic.INSTANCE as AAtomic<T>);

export const boolean = () => atomic<boolean>();
export const string = () => atomic<string>();
export const number = () => atomic<number>();
export const bigint = () => atomic<bigint>();
export const symbol = () => atomic<symbol>();
export const date = () => atomic<Date>();
