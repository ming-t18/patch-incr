export type IsApp<F extends string = string> = { _F?: F };
export type IsApp1<F extends string, T0> = { _F?: F; _T0?: T0; _arity?: 1 };
export type IsApp2<F extends string, T0, T1> = {
	_F?: F;
	_T0?: T0;
	_T1?: T1;
	_arity?: 2;
};
export type IsApp3<F extends string, T0, T1, T2> = {
	_F?: F;
	_T0?: T0;
	_T1?: T1;
	_T2?: T2;
	_arity?: 3;
};

declare const $E: "~$App";
declare const $UnresolvedApp: unique symbol;
export type UNRESOLVED = typeof $UnresolvedApp;

export type ValidAppArgs =
	| [unknown]
	| [unknown, unknown]
	| [unknown, unknown, unknown]
	| [unknown, unknown, unknown, unknown];

/** The brand for HKT type application. Contains function an arguments by key `~$App`. */
export type $Brand<F, Args extends ValidAppArgs> = {
	[$E]?: { f: F; args: Args };
};

export type $1<F, T0> =
	F extends $Brand<infer F1, [infer T_0]>
		? $2<F1, T_0, T0>
		: F extends $Brand<infer F1, [infer T_0, infer T_1]>
			? $3<F1, T_0, T_1, T0>
			: F extends $Brand<infer F1, [infer T_0, infer T_1, infer T_2]>
				? $4<F1, T_0, T_1, T_2, T0>
				: $Brand<F, [T0]> & ResolveType1<F, T0>;

export type $2<F, T0, T1> =
	F extends $Brand<infer F1, [infer T_0]>
		? $3<F1, T_0, T0, T1>
		: F extends $Brand<infer F1, [infer T_0, infer T_1]>
			? $4<F1, T_0, T_1, T0, T1>
			: $Brand<F, [T0, T1]> & ResolveType2<F, T0, T1>;

export type $3<F, T0, T1, T2> =
	F extends $Brand<infer F1, [infer T_0]>
		? $4<F1, T_0, T0, T1, T2>
		: $Brand<F, [T0, T1, T2]> & ResolveType3<F, T0, T1, T2>;

export type $4<F, T0, T1, T2, T3> = $Brand<F, [T0, T1, T2, T3]> &
	ResolveType4<F, T0, T1, T2, T3>;

export type $<F, args extends ValidAppArgs> = args extends [infer T0]
	? $1<F, T0>
	: args extends [infer T0, infer T1]
		? $2<F, T0, T1>
		: args extends [infer T0, infer T1, infer T2]
			? $3<F, T0, T1, T2>
			: args extends [infer T0, infer T1, infer T2, infer T3]
				? $4<F, T0, T1, T2, T3>
				: never;

export interface $Map1<T0 = unknown> {
	Tuple: [T0];
}

export interface $Map2<T0 = unknown, T1 = unknown> {
	Tuple: [T0, T1];
}

export interface $Map3<T0 = unknown, T1 = unknown, T2 = unknown> {
	Tuple: [T0, T1, T2];
}

export interface $Map4<T0 = unknown, T1 = unknown, T2 = unknown, T3 = unknown> {
	Tuple: [T0, T1, T2, T3];
}

export type ResolveType1<F, T0> = F extends keyof $Map1
	? $Map1<T0>[F]
	: F extends IsApp1<infer F1 extends keyof $Map2, infer T_0>
		? $Map2<T_0, T0>[F1]
		: F extends IsApp2<infer F1 extends keyof $Map3, infer T_0, infer T_1>
			? $Map3<T_0, T_1, T0>[F1]
			: F extends IsApp3<
						infer F1 extends keyof $Map4,
						infer T_0,
						infer T_1,
						infer T_2
					>
				? $Map4<T_0, T_1, T_2, T0>[F1]
				: UNRESOLVED;

export type ResolveType2<F, T0, T1> = F extends keyof $Map2
	? $Map2<T0, T1>[F]
	: F extends IsApp1<infer F1 extends keyof $Map3, infer T_0>
		? $Map3<T_0, T0, T1>[F1]
		: F extends IsApp2<infer F1 extends keyof $Map4, infer T_0, infer T_1>
			? $Map4<T_0, T_1, T0, T1>[F1]
			: UNRESOLVED;

export type ResolveType3<F, T0, T1, T2> = F extends keyof $Map3
	? $Map3<T0, T1, T2>[F]
	: F extends IsApp1<infer F1 extends keyof $Map4, infer T_0>
		? $Map4<T_0, T0, T1, T2>[F1]
		: UNRESOLVED;

export type ResolveType4<F, T0, T1, T2, T3> = F extends keyof $Map4
	? $Map4<T0, T1, T2, T3>[F]
	: UNRESOLVED;

// [number, string]
type _Tuple1 = $2<"Tuple", number, string>;
// [number, string, boolean, symbol]
type _ResolveTupleTest = $2<$2<"Tuple", number, string>, boolean, symbol>;

export type Unbrand<T extends $Brand<unknown, ValidAppArgs>> =
	T extends infer T1 & $Brand<infer _F, infer _Args>
		? T1
		: T extends $Brand<infer _F, infer _Args> & infer T1
			? T1
			: T;
