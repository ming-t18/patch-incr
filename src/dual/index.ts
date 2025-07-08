/**
 * # Dual incremental functions
 *
 * @module
 */

export { dfAccess } from "./access";
export { dfCond } from "./cond";

export {
	dfFromAtomic,
	dfFromIF,
	dfFromIFNoMemo,
	dfFromIFWeakMap,
	ifFromDF,
	type Memo,
} from "./convert";
export { dp, dp0, isDP } from "./dp";
export { dfRecord, dfTuple } from "./struct";
export type {
	DF,
	DP,
	DP0,
	DP1,
	DualFunc,
	DualPair,
	InferDFInput,
	InferDFReturn,
} from "./types";
