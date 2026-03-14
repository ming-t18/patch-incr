import type {
	ApplyCombine,
	DRO,
	InferApplyType,
	InferChangeType,
} from "patch-incr/algebra";
import type { TypesKey } from "patch-incr/builder/typeHelpers";
import type { AnyIF, IF } from "patch-incr/types";
export interface ADT<T = unknown, DT = DRO<T>> extends ApplyCombine<T, DT> {}

export type AnyADT = ADT<any, any>;

export type ARO<T> = ADT<T, DRO<T>>;

export type IFADT<A, B, DA, DB> = {
	func: IF<A, B, DA, DB>;
	in: ADT<A, DA>;
	out: ADT<B, DB>;
};

export interface Tuple<Args extends AnyADT[]> {
	intro: <A, DA>(
		args: InferTupleIntro<A, DA, Args>,
	) => IFADT<A, DA, InferTupleTypes<Args>, InferTupleChange<Args>>;
	elim: <B, DB>(
		args: InferTupleElim<B, DB, Args>,
	) => IFADT<InferTupleChange<Args>, InferTupleTypes<Args>, B, DB>;
}

// Tuple

export type InferTupleTypes<Args extends AnyADT[]> = {
	[k in keyof Args]: InferApplyType<Args[k]>;
};

export type InferTupleChange<Args extends AnyADT[]> =
	| DRO<InferTupleTypes<Args>>
	| {
			[k in keyof Args]: InferChangeType<Args[k]>;
	  };

export type InferTupleIntro<A, DA, Args extends AnyADT[]> = {
	[k in keyof Args]: IFADT<
		A,
		DA,
		InferApplyType<Args[k]>,
		InferChangeType<Args[k]>
	>;
};

export type InferTupleElim<B, DB, Args extends AnyADT[]> = {
	[k in keyof Args]: IFADT<
		InferApplyType<Args[k]>,
		InferChangeType<Args[k]>,
		B,
		DB
	>;
};

export interface Tuple<Args extends AnyADT[]>
	extends ADT<InferTupleTypes<Args>, InferTupleChange<Args>> {
	intro: <A, DA>(
		args: InferTupleIntro<A, DA, Args>,
	) => IFADT<A, DA, InferTupleTypes<Args>, InferTupleChange<Args>>;
	elim: <B, DB>(
		args: InferTupleElim<B, DB, Args>,
	) => IFADT<InferTupleChange<Args>, InferTupleTypes<Args>, B, DB>;
}

// Sum

export type InferSumTypes<Args extends Record<string, AnyADT>> = {
	[key in keyof Args]: { type: Args[key]; value: InferApplyType<Args[key]> };
}[keyof Args];

export type InferSumChange<Args extends Record<string, AnyADT>> =
	| DRO<InferSumTypes<Args>>
	| {
			[k in keyof Args]: InferChangeType<Args[k]>;
	  }[keyof Args];

export type InferSumIntro<A, DA, Args extends AnyADT[]> = {
	[k in keyof Args]: IFADT<
		A,
		DA,
		InferApplyType<Args[k]>,
		InferChangeType<Args[k]>
	>;
};

export type InferSumElim<B, DB, Args extends AnyADT[]> = {
	[k in keyof Args]: IFADT<
		InferApplyType<Args[k]>,
		InferChangeType<Args[k]>,
		B,
		DB
	>;
};

export interface Sum<Args extends AnyADT[]> {
	intro: <A, DA>(
		args: InferSumIntro<A, DA, Args>,
	) => IFADT<A, DA, InferSumTypes<Args>, InferSumChange<Args>>;
	elim: <B, DB>(
		args: InferSumElim<B, DB, Args>,
	) => IFADT<InferSumChange<Args>, InferSumTypes<Args>, B, DB>;
}
